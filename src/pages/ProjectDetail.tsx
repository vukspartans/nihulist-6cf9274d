
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, MapPin, Building, Coins, Users, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PriceProposalManager } from '@/components/PriceProposalManager';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/types/project';
import { PROJECT_PHASES } from '@/constants/project';

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Check for edit mode from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('edit') === 'true') {
      setEditDialogOpen(true);
      // Clean up URL after opening dialog
      urlParams.delete('edit');
      navigate(`/projects/${id}${urlParams.toString() ? '?' + urlParams.toString() : ''}`, { replace: true });
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הפרויקט",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handlePhaseChange = async (newPhase: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ phase: newPhase })
        .eq('id', id);

      if (error) throw error;
      
      setProject(prev => prev ? { ...prev, phase: newPhase } : null);
      
      toast({
        title: "עודכן בהצלחה",
        description: "שלב הפרויקט עודכן",
      });
    } catch (error) {
      console.error('Error updating phase:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את שלב הפרויקט",
        variant: "destructive",
      });
    }
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProject(updatedProject);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">פרויקט לא נמצא</h1>
        <Button onClick={() => navigate('/dashboard')}>
          חזרה לדשבורד
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'לא הוגדר';
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4 flip-rtl-180" />
          חזרה לדשבורד
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">שלב הפרויקט:</span>
            <Select value={project.phase} onValueChange={handlePhaseChange}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PROJECT_PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <EditProjectDialog 
            project={project} 
            onProjectUpdate={handleProjectUpdate}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        </div>
      </div>

      {/* Project Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{project.name}</CardTitle>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  <span>{project.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{project.location}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <div>
              <h4 className="font-semibold mb-2">תיאור הפרויקט</h4>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Coins className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">תקציב פרויקט</p>
                <p className="font-semibold">{formatCurrency(project.budget)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calculator className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">תקציב יועצים</p>
                <p className="font-semibold">{formatCurrency(project.advisors_budget)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="proposals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proposals">שליחת בקשות הצעות מחיר</TabsTrigger>
          <TabsTrigger value="received">הצעות מחיר שהתקבלו</TabsTrigger>
          <TabsTrigger value="timeline">ציר זמן</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals">
          <PriceProposalManager
            projectId={project.id}
            projectName={project.name}
            projectType={project.type}
          />
        </TabsContent>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle>הצעות מחיר שהתקבלו</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                לא הגיעו הצעות מחיר עדיין
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>ציר זמן של הפרויקט</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                ציר הזמן יוצג כאן
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
