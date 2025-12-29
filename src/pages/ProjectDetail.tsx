
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, MapPin, Building, Coins, Users, Calculator, Clock, Package, FileText, Eye, FileSignature, Send, Inbox, CheckSquare, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RFPWizard } from '@/components/RFPWizard';
import { EditProjectDialog } from '@/components/EditProjectDialog';
import { ProjectFilesManager } from '@/components/ProjectFilesManager';
import { SelectedAdvisorsTab } from '@/components/SelectedAdvisorsTab';
import { SentRFPsTab } from '@/components/SentRFPsTab';
import { ProposalComparisonDialog } from '@/components/ProposalComparisonDialog';
import { ProposalDetailDialog } from '@/components/ProposalDetailDialog';
import { ProposalComparisonTable } from '@/components/ProposalComparisonTable';
import { VersionBadge } from '@/components/negotiation';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/types/project';
import { PROJECT_PHASES } from '@/constants/project';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import { useAuth } from '@/hooks/useAuth';
import NavigationLogo from '@/components/NavigationLogo';
import { UserHeader } from '@/components/UserHeader';
import BackToTop from '@/components/BackToTop';
import { TaskBoard } from '@/components/tasks';
import { PaymentDashboard } from '@/components/payments';

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { primaryRole } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  
  interface ProposalWithAdvisor {
    id: string;
    advisor_id: string;
    project_id: string;
    supplier_name: string;
    price: number;
    timeline_days: number;
    submitted_at: string;
    status: string;
    scope_text?: string;
    files?: any[];
    signature_blob?: string;
    advisors?: {
      id: string;
      company_name: string;
      logo_url: string | null;
      expertise: string[];
      rating: number | null;
      location: string | null;
    };
  }
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [rfpSent, setRfpSent] = useState(false);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('proposals');


  // Check for edit mode and tab from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('edit') === 'true') {
      setEditDialogOpen(true);
    }
    if (urlParams.get('tab')) {
      setActiveTab(urlParams.get('tab') || 'proposals');
    }
    // Clean up URL after reading params
    if (urlParams.get('edit') || urlParams.get('tab')) {
      urlParams.delete('edit');
      urlParams.delete('tab');
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
      // First fetch proposals with advisor data - include fee_line_items for comparison table
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select(`
          id,
          advisor_id,
          project_id,
          supplier_name,
          price,
          timeline_days,
          submitted_at,
          status,
          scope_text,
          files,
          signature_blob,
          fee_line_items,
          current_version,
          has_active_negotiation,
          conditions_json,
          terms,
          ai_analysis,
          file_summaries,
          declaration_text,
          advisors!proposals_advisor_id_fkey (
            id,
            company_name,
            logo_url,
            expertise,
            rating,
            location,
            founding_year,
            office_size,
            website,
            linkedin_url
          )
        `)
        .eq('project_id', id)
        .order('submitted_at', { ascending: false });

      if (proposalsError) throw proposalsError;

      // Fetch RFP invite context for each proposal
      const proposalsWithContext = await Promise.all(
        (proposalsData || []).map(async (proposal) => {
          // Get the RFP invite for this advisor
          const { data: inviteData } = await supabase
            .from('rfp_invites')
            .select('advisor_type, request_title, deadline_at')
            .eq('advisor_id', proposal.advisor_id)
            .eq('rfp_id', (
              await supabase
                .from('rfps')
                .select('id')
                .eq('project_id', id)
                .order('sent_at', { ascending: false })
                .limit(1)
                .single()
            ).data?.id || '')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...proposal,
            rfp_invite: inviteData || undefined
          };
        })
      );

      setProposals(proposalsWithContext);
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
        <Button onClick={() => navigate(getDashboardRouteForRole(primaryRole))}>
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      submitted: { variant: 'outline', label: 'ממתין להחלטה' },
      accepted: { variant: 'success', label: '✓ הצעה אושרה' },
      rejected: { variant: 'destructive', label: 'נדחתה' },
      withdrawn: { variant: 'muted', label: 'בוטל' },
      resubmitted: { variant: 'secondary', label: '🔄 הצעה מעודכנת' },
      negotiation_requested: { variant: 'warning', label: '💬 במשא ומתן' },
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setDetailDialogOpen(true);
  };

  const getLowestPrice = () => {
    if (proposals.length === 0) return null;
    return Math.min(...proposals.map(p => p.price));
  };

  const getFastestTimeline = () => {
    if (proposals.length === 0) return null;
    return Math.min(...proposals.map(p => p.timeline_days));
  };

  const handleCompareProposals = () => {
    const submittedProposals = proposals.filter(p => p.status === 'submitted' || p.status === 'resubmitted');
    if (submittedProposals.length > 0) {
      setSelectedProposalIds(submittedProposals.map(p => p.id));
      setComparisonDialogOpen(true);
    }
  };

  return (
    <div dir="rtl">
      {/* Sticky Top Bar - Consistent with Dashboard */}
      <div className="sticky top-0 z-50 bg-background flex justify-between items-center p-6 border-b">
        <NavigationLogo size="md" />
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(getDashboardRouteForRole(primaryRole))}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לדשבורד
          </Button>
          <UserHeader />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto p-6">
        {/* Project Controls Bar */}
        <div className="flex items-center justify-between mb-6">
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir="rtl">
        <TabsList className="flex w-full h-auto overflow-x-auto gap-1 p-1">
          <TabsTrigger value="proposals" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-[44px] whitespace-nowrap">
            <Send className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">שליחת בקשה להצעות</span>
          </TabsTrigger>
          <TabsTrigger 
            value="sent-rfps" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-[44px] whitespace-nowrap"
          >
            <FileSignature className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">בקשות שנשלחו</span>
          </TabsTrigger>
          <TabsTrigger 
            value="received" 
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-[44px] whitespace-nowrap"
          >
            <Inbox className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">הצעות שהתקבלו</span>
            {proposals.length > 0 && (
              <Badge variant="secondary" className="mr-1 text-xs">
                {proposals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="advisors" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-[44px] whitespace-nowrap">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">היועצים שלי</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-[44px] whitespace-nowrap">
            <CheckSquare className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">משימות</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-[44px] whitespace-nowrap">
            <Wallet className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">תשלומים</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2 min-w-[44px] whitespace-nowrap">
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">קבצים</span>
            {projectFiles.length > 0 && (
              <Badge variant="secondary" className="mr-1 text-xs">
                {projectFiles.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals">
          <RFPWizard
            projectId={project.id}
            projectName={project.name || project.location}
            projectType={project.type}
            projectLocation={project.location}
            onRfpSent={() => {
              setRfpSent(true);
              fetchProposals();
            }}
          />
        </TabsContent>

        <TabsContent value="sent-rfps">
          <SentRFPsTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  הצעות שהתקבלו
                  {proposals.length > 0 && (
                    <Badge variant="secondary">{proposals.length}</Badge>
                  )}
                </CardTitle>
                {proposals.filter(p => p.status === 'submitted' || p.status === 'resubmitted').length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleCompareProposals}
                  >
                    <Eye className="w-4 h-4 ml-2" />
                    השווה הצעות
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProposalComparisonTable
                proposals={proposals}
                onViewProposal={handleViewProposal}
                loading={proposalsLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advisors">
          <SelectedAdvisorsTab 
            projectId={project.id} 
            onNavigateToProposals={() => setActiveTab('received')}
          />
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

        <TabsContent value="tasks">
          <TaskBoard projectId={project.id} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentDashboard projectId={project.id} />
        </TabsContent>
      </Tabs>

      <ProposalComparisonDialog
        open={comparisonDialogOpen}
        onOpenChange={setComparisonDialogOpen}
        proposalIds={selectedProposalIds}
        advisorType={project.type || 'כללי'}
        projectId={project.id}
      />

      {selectedProposal && (
        <ProposalDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          proposal={selectedProposal}
          projectId={project.id}
          projectName={project.name || project.location}
          onStatusChange={() => {
            fetchProposals();
            setSelectedProposal(null);
          }}
        />
      )}
      </div>
      <BackToTop />
    </div>
  );
};
