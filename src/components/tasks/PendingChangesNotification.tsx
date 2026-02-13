import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { ChangeRequestReviewDialog } from './ChangeRequestReviewDialog';
import { useTaskChangeRequests } from '@/hooks/useTaskChangeRequests';
import { useAuth } from '@/hooks/useAuth';

interface PendingChangesNotificationProps {
  projectId: string | null;
  onRequestProcessed?: () => void;
}

export function PendingChangesNotification({ projectId, onRequestProcessed }: PendingChangesNotificationProps) {
  const { user } = useAuth();
  const { requests, pendingCount, reviewChangeRequest, refetch } = useTaskChangeRequests(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (pendingCount === 0) return null;

  const handleApprove = async (requestId: string, note?: string) => {
    const success = await reviewChangeRequest(requestId, 'approved', user?.id || '', note);
    if (success) {
      onRequestProcessed?.();
      await refetch();
    }
    return success;
  };

  const handleReject = async (requestId: string, note?: string) => {
    const success = await reviewChangeRequest(requestId, 'rejected', user?.id || '', note);
    if (success) {
      onRequestProcessed?.();
      await refetch();
    }
    return success;
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs relative"
        onClick={() => setDialogOpen(true)}
      >
        <Bell className="w-3.5 h-3.5" />
        בקשות שינוי
        <Badge variant="destructive" className="h-5 min-w-[20px] px-1 text-[10px]">
          {pendingCount}
        </Badge>
      </Button>

      <ChangeRequestReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        requests={requests}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
}
