import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Coins } from 'lucide-react';
import { AdvisorProposal } from '@/hooks/advisor/useAdvisorProposals';
import { ProposalStatusBadge } from '@/components/ProposalStatusBadge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ProposalCardProps {
  proposal: AdvisorProposal;
  onViewProject: (projectId: string) => void;
}

export const ProposalCard = ({ proposal, onViewProject }: ProposalCardProps) => {
  const approvalDetails = proposal.project_advisors?.[0];
  const isAccepted = proposal.status === 'accepted' && approvalDetails;

  return (
    <Card className="hover:shadow-card transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{proposal.projects.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {proposal.projects.type}
            </p>
          </div>
          <ProposalStatusBadge
            proposalStatus={proposal.status}
            submittedAt={proposal.submitted_at}
            approvedAt={approvalDetails?.selected_at}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Proposal Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4 shrink-0" />
            <span>₪{proposal.price.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{proposal.timeline_days} ימים</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{proposal.projects.location}</span>
          </div>
        </div>

        {/* Approval Details */}
        {isAccepted && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-amber-900">
              פרטי אישור ההצעה
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {approvalDetails.selected_at && (
                <div>
                  <span className="text-muted-foreground">אושרה ב: </span>
                  <span className="font-medium text-foreground">
                    {format(new Date(approvalDetails.selected_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </span>
                </div>
              )}
              {approvalDetails.fee_amount && (
                <div>
                  <span className="text-muted-foreground">שכר טרחה: </span>
                  <span className="font-medium text-foreground">
                    {approvalDetails.fee_currency || 'ILS'} {approvalDetails.fee_amount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {approvalDetails.payment_terms && (
              <div className="text-sm">
                <span className="text-muted-foreground">תנאי תשלום: </span>
                <span className="text-foreground">{approvalDetails.payment_terms}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProject(proposal.project_id)}
            className="flex-1"
          >
            צפה בפרויקט
          </Button>
          {isAccepted && approvalDetails.agreement_url && (
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(approvalDetails.agreement_url, '_blank')}
              className="flex-1"
            >
              צפה בהסכם
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
