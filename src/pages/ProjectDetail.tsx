
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Building, Coins, Users, Calculator, Clock, Package, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RFPWizard } from '@/components/RFPWizard';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { ProjectFilesManager } from '@/components/ProjectFilesManager';
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
  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [rfpSent, setRfpSent] = useState(false);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);


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
      fetchProposals();
      fetchProjectFiles();
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

  const fetchProposals = async () => {
    if (!id) return;
    setProposalsLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('project_id', id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setProposalsLoading(false);
    }
  };

  const fetchProjectFiles = async () => {
    if (!id) return;
    setFilesLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjectFiles(data || []);
    } catch (error) {
      console.error('Error fetching project files:', error);
    } finally {
      setFilesLoading(false);
    }
  };

  const checkRfpStatus = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('rfps')
        .select('id')
        .eq('project_id', id)
        .maybeSingle();

      if (error) throw error;
      setRfpSent(!!data);
    } catch (error) {
      console.error('Error checking RFP status:', error);
    }
  };

  useEffect(() => {
    if (id) {
      checkRfpStatus();
    }
  }, [id]);


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
        <p className="text-muted-foreground mb-4">
          פרויקט עם מזהה {id} לא נמצא או שאין לך הרשאה לצפות בו.
        </p>
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
          <ArrowLeft className="w-4 h-4" />
          חזרה לדשבורד
        </Button>
        
        <div className="flex items-center gap-4" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">שלב הפרויקט:</span>
            <Select value={project.phase} onValueChange={handlePhaseChange}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
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
              <CardTitle className="text-2xl mb-2">{project.name || project.location}</CardTitle>
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
      <Tabs defaultValue="proposals" className="space-y-6" dir="rtl">
        <TabsList className="grid w-full grid-cols-4 h-11">
          <TabsTrigger value="proposals" className="text-right">שליחת בקשה להצעות מחיר</TabsTrigger>
          <TabsTrigger 
            value="received" 
            className="text-right flex items-center gap-2"
            disabled={!rfpSent}
          >
            הצעות מחיר שהתקבלו
            {proposals.length > 0 && (
              <Badge variant="secondary" className="mr-1">
                {proposals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="text-right flex items-center gap-2">
            <FileText className="w-4 h-4" />
            קבצים
            {projectFiles.length > 0 && (
              <Badge variant="secondary" className="mr-1">
                {projectFiles.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-right">ציר זמן</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals">
          <RFPWizard
            projectId={project.id}
            projectName={project.name || project.location}
            projectType={project.type}
            onRfpSent={() => {
              setRfpSent(true);
              fetchProposals();
            }}
          />
        </TabsContent>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                הצעות מחיר שהתקבלו
                {proposals.length > 0 && (
                  <Badge variant="secondary">{proposals.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proposalsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">טוען הצעות מחיר...</p>
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">מחכה להצעות מחיר</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    הזמנות נשלחו לספקים והם יגיבו בקרוב. 
                    ההצעות יופיעו כאן ברגע שיתקבלו.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <Card key={proposal.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold">{proposal.supplier_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              נשלח ב-{new Date(proposal.submitted_at).toLocaleDateString('he-IL')}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-primary">
                              {new Intl.NumberFormat('he-IL', {
                                style: 'currency',
                                currency: 'ILS',
                                minimumFractionDigits: 0,
                              }).format(proposal.price)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {proposal.timeline_days} ימי עבודה
                            </p>
                          </div>
                        </div>
                        {proposal.terms && (
                          <p className="text-sm text-muted-foreground border-t pt-3 mt-3">
                            {proposal.terms}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                קבצי הפרויקט
                {projectFiles.length > 0 && (
                  <Badge variant="secondary">{projectFiles.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">טוען קבצים...</p>
                </div>
              ) : (
                <ProjectFilesManager
                  projectId={project.id}
                  files={projectFiles}
                  onFilesUpdate={fetchProjectFiles}
                />
              )}
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
