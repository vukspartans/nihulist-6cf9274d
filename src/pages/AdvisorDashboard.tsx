import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { DeclineRFPDialog } from '@/components/DeclineRFPDialog';
import { useDeclineRFP } from '@/hooks/useDeclineRFP';
import BackToTop from '@/components/BackToTop';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAdvisorUserData } from '@/hooks/advisor/useAdvisorUserData';
import { useAdvisorProfile } from '@/hooks/advisor/useAdvisorProfile';
import { useAdvisorRFPInvites } from '@/hooks/advisor/useAdvisorRFPInvites';
import { useAdvisorProposals } from '@/hooks/advisor/useAdvisorProposals';
import { useLogoUpload } from '@/hooks/advisor/useLogoUpload';
import { useProfileCompletion } from '@/hooks/shared/useProfileCompletion';
import { useProposalFilters } from '@/hooks/shared/useProposalFilters';
import { useRFPInviteFilters } from '@/hooks/shared/useRFPInviteFilters';
import { AdvisorDashboardHeader } from '@/components/advisor/dashboard/AdvisorDashboardHeader';
import { AdvisorCoverSection } from '@/components/advisor/dashboard/AdvisorCoverSection';
import { AdvisorProfileSection } from '@/components/advisor/dashboard/AdvisorProfileSection';
import { AdvisorStatsCards } from '@/components/advisor/dashboard/AdvisorStatsCards';
import { ProfileCompletionAlert } from '@/components/advisor/dashboard/ProfileCompletionAlert';
import { DashboardLoadingState } from '@/components/advisor/dashboard/DashboardLoadingState';
import { RFPInvitesTab } from '@/components/advisor/dashboard/RFPInvitesTab';
import { ProposalsTab } from '@/components/advisor/dashboard/ProposalsTab';
import { WinningProposalsTab } from '@/components/advisor/dashboard/WinningProposalsTab';

const AdvisorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedInviteToDecline, setSelectedInviteToDecline] = useState<string | null>(null);

  const { data: userProfile, isLoading: userLoading } = useAdvisorUserData(user?.id);
  const { data: advisorProfile, isLoading: advisorLoading } = useAdvisorProfile(user?.id);
  const { data: rfpInvites = [], isLoading: invitesLoading } = useAdvisorRFPInvites(advisorProfile?.id);
  const { data: proposals = [], isLoading: proposalsLoading } = useAdvisorProposals(advisorProfile?.id);

  const logoUpload = useLogoUpload(advisorProfile?.id, user?.id);
  const profileCompletion = useProfileCompletion(advisorProfile, userProfile);
  const proposalFilters = useProposalFilters(proposals);
  const rfpInviteFilters = useRFPInviteFilters(rfpInvites);
  const { handleDecline, declineDialogOpen, setDeclineDialogOpen } = useDeclineRFP(selectedInviteToDecline, () => setSelectedInviteToDecline(null));

  if (userLoading || advisorLoading || invitesLoading || proposalsLoading) return <DashboardLoadingState />;
  if (!advisorProfile) return <div className="min-h-screen bg-background flex items-center justify-center p-4"><Alert className="max-w-md"><AlertCircle className="h-4 w-4" /><AlertDescription>לא נמצא פרופיל יועץ</AlertDescription></Alert></div>;

  const winningProposals = proposals.filter(p => p.status === 'accepted' && p.project_advisors?.length);
  const stats = { totalActiveRFPs: rfpInviteFilters.counts.total, newInvites: rfpInviteFilters.counts.new, submittedProposals: proposalFilters.counts.submitted + proposalFilters.counts.under_review, unsubmittedInvites: rfpInviteFilters.counts.unsubmitted, winningProposals: winningProposals.length };

  return (
    <div className="min-h-screen bg-background">
      <AdvisorDashboardHeader />
      <AdvisorCoverSection coverImageUrl={advisorProfile.cover_image_url} />
      <div className="container mx-auto px-4 pb-12">
        <AdvisorProfileSection advisorProfile={advisorProfile} onLogoUpload={(file) => logoUpload.mutate(file)} isUploading={logoUpload.isLoading} />
        <div className="mt-8"><ProfileCompletionAlert percentage={profileCompletion.percentage} firstMissingField={profileCompletion.firstMissingField} /></div>
        <AdvisorStatsCards stats={stats} />
        <Tabs defaultValue="invites" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="invites">הזמנות RFP</TabsTrigger>
            <TabsTrigger value="proposals">הצעות שלי</TabsTrigger>
            <TabsTrigger value="winning">הצעות זוכות</TabsTrigger>
          </TabsList>
          <TabsContent value="invites"><RFPInvitesTab invites={rfpInviteFilters.filteredInvites} showActiveOnly={rfpInviteFilters.showActiveOnly} onToggleFilter={() => rfpInviteFilters.setShowActiveOnly(!rfpInviteFilters.showActiveOnly)} onViewDetails={(_, projectId) => navigate(`/rfp/${_}`)} onSubmitProposal={(inviteId) => navigate(`/submit-proposal/${inviteId}`)} onDecline={(id) => { setSelectedInviteToDecline(id); setDeclineDialogOpen(true); }} /></TabsContent>
          <TabsContent value="proposals"><ProposalsTab proposals={proposalFilters.filteredProposals} filter={proposalFilters.filter} onFilterChange={proposalFilters.setFilter} counts={proposalFilters.counts} onViewProject={(id) => navigate(`/project/${id}`)} /></TabsContent>
          <TabsContent value="winning"><WinningProposalsTab proposals={proposals} onViewProject={(id) => navigate(`/project/${id}`)} /></TabsContent>
        </Tabs>
      </div>
      <DeclineRFPDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen} onDecline={handleDecline} />
      <BackToTop />
    </div>
  );
};

export default AdvisorDashboard;
