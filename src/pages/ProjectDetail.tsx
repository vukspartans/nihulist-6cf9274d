import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, MapPin, DollarSign, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RFPManager } from '@/components/RFPManager';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  type: string;
  location: string;
  budget: number;
  timeline_start: string;
  timeline_end: string;
  status: string;
  created_at: string;
}

interface Proposal {
  id: string;
  supplier_name: string;
  price: number;
  timeline_days: number;
  status: string;
  submitted_at: string;
  terms: string;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const fetchProjectData = async () => {
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // Fetch proposals
        const { data: proposalsData, error: proposalsError } = await supabase
          .from('proposals')
          .select('*')
          .eq('project_id', id)
          .order('submitted_at', { ascending: false });

        if (proposalsError) throw proposalsError;
        setProposals(proposalsData || []);

      } catch (error) {
        console.error('Error fetching project data:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לטעון את פרטי הפרויקט",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [id, user, toast]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">פרויקט לא נמצא</h1>
          <Button onClick={() => window.history.back()}>חזרה</Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Project Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {project.location}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(project.budget)}
              </span>
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status === 'draft' ? 'טיוטה' : 
                 project.status === 'active' ? 'פעיל' : 
                 project.status === 'completed' ? 'הושלם' : project.status}
              </Badge>
            </div>
          </div>
          <Button onClick={() => window.history.back()} variant="outline">
            חזרה לפרויקטים
          </Button>
        </div>

        {/* Project Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>פרטי הפרויקט</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">תאריך התחלה</p>
                <p className="font-semibold">{formatDate(project.timeline_start)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">תאריך סיום</p>
                <p className="font-semibold">{formatDate(project.timeline_end)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">תקציב</p>
                <p className="font-semibold">{formatCurrency(project.budget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="rfp" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rfp">שליחת בקשות הצעות</TabsTrigger>
            <TabsTrigger value="proposals">הצעות שהתקבלו ({proposals.length})</TabsTrigger>
            <TabsTrigger value="files">קבצים</TabsTrigger>
          </TabsList>

          <TabsContent value="rfp">
            <RFPManager 
              projectId={project.id} 
              projectName={project.name}
              projectType={project.type || 'לא צוין'}
            />
          </TabsContent>

          <TabsContent value="proposals">
            <div className="space-y-4">
              {proposals.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold">אין הצעות עדיין</h3>
                      <p className="text-muted-foreground">שלח בקשות הצעות לקבלנים כדי להתחיל לקבל הצעות</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                proposals.map((proposal) => (
                  <Card key={proposal.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{proposal.supplier_name}</CardTitle>
                          <CardDescription>
                            הוגש ב-{formatDate(proposal.submitted_at)}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={proposal.status === 'received' ? 'default' : 'secondary'}
                        >
                          {proposal.status === 'received' ? 'התקבל' : 
                           proposal.status === 'accepted' ? 'אושר' : 
                           proposal.status === 'rejected' ? 'נדחה' : proposal.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">מחיר</p>
                          <p className="text-lg font-semibold">{formatCurrency(proposal.price)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">משך זמן (ימים)</p>
                          <p className="text-lg font-semibold">{proposal.timeline_days}</p>
                        </div>
                        <div>
                          <Button variant="outline" className="w-full">
                            צפה בפרטים
                            <ArrowRight className="mr-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {proposal.terms && (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">תנאים נוספים</p>
                            <p className="text-sm">{proposal.terms}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>קבצי הפרויקט</CardTitle>
                <CardDescription>העלה וצפה בקבצים הקשורים לפרויקט</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  תכונת העלאת קבצים תתווסף בקרוב
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail;