import { RFPInvite } from '@/hooks/advisor/useAdvisorRFPInvites';
import { RFPInviteCard } from '@/components/advisor/shared/RFPInviteCard';
import { EmptyState } from '@/components/advisor/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface RFPInvitesTabProps {
  invites: RFPInvite[];
  showActiveOnly: boolean;
  onToggleFilter: () => void;
  onViewDetails: (inviteId: string, projectId: string) => void;
  onSubmitProposal: (inviteId: string, projectId: string) => void;
  onDecline: (inviteId: string) => void;
}

export const RFPInvitesTab = ({
  invites,
  showActiveOnly,
  onToggleFilter,
  onViewDetails,
  onSubmitProposal,
  onDecline,
}: RFPInvitesTabProps) => {
  return (
    <div className="space-y-4">
      {/* Filter Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">
          הזמנות להצעות מחיר ({invites.length})
        </h3>
        <Button
          variant={showActiveOnly ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleFilter}
        >
          {showActiveOnly ? 'הצג הכל' : 'פעילות בלבד'}
        </Button>
      </div>

      {/* Invites List */}
      {invites.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="אין הזמנות להצעות מחיר"
          description={
            showActiveOnly
              ? 'אין הזמנות פעילות כרגע. נסה להציג את כל ההזמנות.'
              : 'עדיין לא קיבלת הזמנות להצעות מחיר.'
          }
        />
      ) : (
        <div className="grid gap-4">
          {invites.map((invite) => (
            <RFPInviteCard
              key={invite.id}
              invite={invite}
              onViewDetails={onViewDetails}
              onSubmitProposal={onSubmitProposal}
              onDecline={onDecline}
            />
          ))}
        </div>
      )}
    </div>
  );
};
