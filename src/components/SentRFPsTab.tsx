import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, Eye, CheckCircle2, Clock, XCircle, FileText, Send, Calendar, Loader2, Ban } from 'lucide-react';
import { useRFPInvitesWithDetails, AdvisorTypeGroup, AdvisorTypeInvite } from '@/hooks/useRFPInvitesWithDetails';
import { ProposalDetailDialog } from './ProposalDetailDialog';
import { NegotiationStepsTimeline, NegotiationStep } from './NegotiationStepsTimeline';
import { EntrepreneurNegotiationView } from './negotiation/EntrepreneurNegotiationView';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SentRFPsTabProps {
  projectId: string;
}

export const SentRFPsTab = ({ projectId }: SentRFPsTabProps) => {
  const { data: advisorTypeGroups, isLoading, error } = useRFPInvitesWithDetails(projectId);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingProposalId, setLoadingProposalId] = useState<string | null>(null);
  
  // Negotiation view state
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  // Helper function to translate status to Hebrew
  const translateStatus = (status: string, proposalStatus?: string): string => {
    // If there's a proposal, show proposal-based status
    if (proposalStatus) {
      const proposalStatusMap: Record<string, string> = {
        'submitted': 'הצעה התקבלה',
        'resubmitted': 'הצעה מעודכנת',
        'negotiation_requested': 'משא ומתן',
        'accepted': 'מאושרת',
        'rejected': 'נדחתה',
      };
      return proposalStatusMap[proposalStatus] || proposalStatusMap['submitted'] || status;
    }
    
    const statusMap: Record<string, string> = {
      'pending': 'ממתין לשליחה',
      'sent': 'נשלח',
      'opened': 'נצפה',
      'in_progress': 'בתהליך',
      'submitted': 'ממתין להצעה',
      'declined': 'סורב',
      'expired': 'פג תוקף',
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string, proposalStatus?: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
    if (proposalStatus === 'accepted') return 'success';
    if (proposalStatus === 'negotiation_requested') return 'secondary';
    if (proposalStatus === 'submitted' || proposalStatus === 'resubmitted') return 'success';
    
    switch (status) {
      case 'submitted':
        return 'success';
      case 'in_progress':
      case 'opened':
        return 'secondary';
      case 'declined':
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string, proposalStatus?: string) => {
    if (proposalStatus === 'accepted') return <CheckCircle2 className="h-3.5 w-3.5" />;
    if (proposalStatus === 'negotiation_requested') return <Clock className="h-3.5 w-3.5" />;
    if (proposalStatus) return <CheckCircle2 className="h-3.5 w-3.5" />;
    
    switch (status) {
      case 'submitted':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'in_progress':
      case 'opened':
        return <Clock className="h-3.5 w-3.5" />;
      case 'declined':
        return <Ban className="h-3.5 w-3.5" />;
      case 'expired':
        return <XCircle className="h-3.5 w-3.5" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const handleViewProposal = async (proposalId: string) => {
    setLoadingProposalId(proposalId);
    try {
      const { data: proposalData, error: fetchError } = await supabase
        .from('proposals')
        .select(`
          *,
          advisors!proposals_advisor_id_fkey (
            id, company_name, logo_url, expertise, rating, 
            location, founding_year, office_size, website, linkedin_url
          ),
          rfp_invite:rfp_invite_id (
            advisor_type, request_title, deadline_at
          )
        `)
        .eq('id', proposalId)
        .single();
      
      if (fetchError) throw fetchError;
      
      setSelectedProposal(proposalData);
      setDetailDialogOpen(true);
    } catch (err) {
      console.error('Error fetching proposal:', err);
      toast.error('שגיאה בטעינת ההצעה');
    } finally {
      setLoadingProposalId(null);
    }
  };

  // Handle viewing a negotiation step
  const handleViewStep = (step: NegotiationStep) => {
    if (step.viewData.type === 'proposal') {
      handleViewProposal(step.viewData.id);
    } else if (step.viewData.type === 'negotiation_session') {
      setViewingSessionId(step.viewData.id);
    } else if (step.viewData.type === 'version') {
      // For now, show toast - future enhancement
      toast.info('צפייה בגרסה ספציפית - בפיתוח');
    }
  };

  // Safe date formatting helper
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy', { locale: he });
    } catch {
      return '-';
    }
  };

  // Format price
  const formatPrice = (price: number | undefined, currency?: string): string => {
    if (price === undefined || price === null) return '-';
    const symbol = currency === 'USD' ? '$' : '₪';
    return `${symbol}${price.toLocaleString()}`;
  };

  // Check if invite has negotiation history
  const hasNegotiationHistory = (invite: AdvisorTypeInvite): boolean => {
    return (invite.negotiationSteps?.length ?? 0) > 1;
  };

  // Render a single invite card
  const renderInviteCard = (invite: AdvisorTypeInvite) => {
    const hasProposal = !!invite.proposalId;
    const isDeclined = invite.status === 'declined';
    const isExpired = invite.status === 'expired';
    const showTimeline = hasNegotiationHistory(invite);
    
    return (
      <Card 
        key={invite.inviteId} 
        className={`transition-all ${isDeclined || isExpired ? 'opacity-70 bg-muted/30' : ''}`}
      >
        {/* Header: Advisor name + Status */}
        <CardHeader className="py-3 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 flex-shrink-0">
                {invite.advisorLogo && <AvatarImage src={invite.advisorLogo} alt={invite.advisorName} />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {invite.advisorName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-base truncate">{invite.advisorName}</span>
            </div>
            
            <Badge 
              variant={getStatusVariant(invite.status, invite.proposalStatus)}
              className="gap-1 flex-shrink-0"
            >
              {getStatusIcon(invite.status, invite.proposalStatus)}
              {translateStatus(invite.status, invite.proposalStatus)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="py-2 space-y-3">
          {/* Info row with labels */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium">נשלח:</span>
              <span>{formatDate(invite.rfpSentAt)}</span>
            </div>
            
            {invite.deadlineAt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">דדליין:</span>
                <span>{formatDate(invite.deadlineAt)}</span>
              </div>
            )}
            
            {invite.currentPrice !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">מחיר נוכחי:</span>
                <span className="font-semibold text-foreground">
                  {formatPrice(invite.currentPrice, invite.currency)}
                </span>
                {invite.originalPrice !== undefined && invite.currentPrice !== invite.originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(invite.originalPrice, invite.currency)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Decline reason */}
          {isDeclined && (invite.declineReason || invite.declineNote) && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-sm">
              <Ban className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-destructive">סיבת סירוב: </span>
                <span className="text-muted-foreground">
                  {invite.declineNote || invite.declineReason || 'לא צוינה סיבה'}
                </span>
              </div>
            </div>
          )}

          {/* Waiting for proposal state */}
          {!hasProposal && !isDeclined && !isExpired && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>ממתין להצעה מהיועץ</span>
            </div>
          )}

          {/* Negotiation timeline - always visible when exists */}
          {showTimeline && invite.negotiationSteps && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  היסטוריית משא ומתן
                </span>
                <Badge variant="outline" className="text-xs py-0">
                  {invite.negotiationSteps.length} שלבים
                </Badge>
              </div>
              <NegotiationStepsTimeline 
                steps={invite.negotiationSteps} 
                onViewStep={handleViewStep}
              />
            </div>
          )}
        </CardContent>

        {/* Footer with CTA */}
        {hasProposal && (
          <CardFooter className="py-2 border-t justify-end bg-muted/20">
            <Button
              onClick={() => handleViewProposal(invite.proposalId!)}
              disabled={loadingProposalId === invite.proposalId}
              className="gap-1.5"
            >
              {loadingProposalId === invite.proposalId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              צפה בהצעה המלאה
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>טוען בקשות...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>שגיאה בטעינת הבקשות</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!advisorTypeGroups || advisorTypeGroups.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>לא נשלחו בקשות עדיין</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total invites and proposals across all groups
  const totalInvites = advisorTypeGroups.reduce((sum, g) => sum + g.totalInvites, 0);
  const totalProposals = advisorTypeGroups.reduce((sum, g) => sum + g.proposalsCount, 0);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Summary header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">בקשות שנשלחו לפי סוג יועץ</h3>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{advisorTypeGroups.length} תחומים</Badge>
          <Badge variant="outline">{totalInvites} בקשות</Badge>
          {totalProposals > 0 && (
            <Badge variant="success">{totalProposals} הצעות</Badge>
          )}
        </div>
      </div>

      {/* Accordion for advisor types */}
      <Accordion type="single" collapsible className="w-full space-y-2">
        {advisorTypeGroups.map((group: AdvisorTypeGroup) => (
          <AccordionItem 
            key={group.advisorType} 
            value={group.advisorType}
            className="border rounded-lg bg-card"
          >
            <AccordionTrigger className="hover:no-underline px-4">
              <div className="flex items-center justify-between flex-1 pe-4">
                <span className="font-semibold">{group.advisorType}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {group.totalInvites === 1 ? 'בקשה 1' : `${group.totalInvites} בקשות`}
                  </Badge>
                  {group.proposalsCount > 0 && (
                    <Badge variant="success">
                      {group.proposalsCount === 1 ? 'הצעה 1' : `${group.proposalsCount} הצעות`}
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {group.invites.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  לא נשלחו הזמנות ליועצים עבור תחום זה.
                </div>
              ) : (
                <div className="grid gap-3">
                  {group.invites.map(renderInviteCard)}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Proposal Detail Dialog */}
      {selectedProposal && (
        <ProposalDetailDialog
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) setSelectedProposal(null);
          }}
          proposal={selectedProposal}
          projectId={projectId}
        />
      )}

      {/* Negotiation Session View Dialog */}
      <EntrepreneurNegotiationView
        open={!!viewingSessionId}
        onOpenChange={(open) => !open && setViewingSessionId(null)}
        sessionId={viewingSessionId}
      />
    </div>
  );
};
