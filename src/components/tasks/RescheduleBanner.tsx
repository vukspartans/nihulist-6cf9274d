import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, X } from 'lucide-react';
import type { RescheduleProposal } from '@/hooks/useRescheduleProposals';

interface RescheduleBannerProps {
  proposals: RescheduleProposal[];
  onReview: (proposal: RescheduleProposal) => void;
  onDismiss: (proposalId: string) => void;
}

export function RescheduleBanner({ proposals, onReview, onDismiss }: RescheduleBannerProps) {
  if (proposals.length === 0) return null;

  return (
    <div className="space-y-2">
      {proposals.map(proposal => (
        <Card key={proposal.id} className="border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardContent className="p-4 flex items-center justify-between gap-4" dir="rtl">
            <div className="flex items-center gap-3 flex-1">
              <CalendarClock className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
                  זוהה עיכוב של {proposal.delay_days} ימים במשימה &quot;{proposal.trigger_task_name}&quot;
                  {' — '}
                  {proposal.proposed_changes.length} משימות תלויות מושפעות
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                  סקור את ההצעה לעדכון לוח זמנים
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="default" onClick={() => onReview(proposal)}>
                סקור הצעה
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDismiss(proposal.id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
