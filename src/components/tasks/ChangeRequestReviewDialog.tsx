import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Clock } from 'lucide-react';
import type { TaskChangeRequest } from '@/hooks/useTaskChangeRequests';

const FIELD_LABELS: Record<string, string> = {
  name: 'שם המשימה',
  description: 'תיאור',
  status: 'סטטוס',
  phase: 'שלב',
  planned_start_date: 'תחילה מתוכננת',
  planned_end_date: 'סיום מתוכנן',
  actual_start_date: 'תחילה בפועל',
  actual_end_date: 'סיום בפועל',
  progress_percent: 'התקדמות',
  notes: 'הערות',
  block_reason: 'סיבת חסימה',
  is_milestone: 'אבן דרך',
  is_blocked: 'חסום',
};

interface ChangeRequestReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: TaskChangeRequest[];
  onApprove: (requestId: string, note?: string) => Promise<boolean>;
  onReject: (requestId: string, note?: string) => Promise<boolean>;
}

export function ChangeRequestReviewDialog({
  open,
  onOpenChange,
  requests,
  onApprove,
  onReject,
}: ChangeRequestReviewDialogProps) {
  const [reviewNote, setReviewNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    const fn = action === 'approved' ? onApprove : onReject;
    await fn(requestId, reviewNote);
    setReviewNote('');
    setProcessingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            בקשות שינוי ממתינות ({requests.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1">
            {requests.length === 0 && (
              <p className="text-center text-muted-foreground py-4">אין בקשות ממתינות</p>
            )}
            {requests.map(req => (
              <div key={req.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{req.task_name}</h4>
                  <Badge variant="secondary" className="text-[10px]">
                    {req.requester_name}
                  </Badge>
                </div>

                {/* Show changes */}
                <div className="space-y-1">
                  {Object.entries(req.requested_changes).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-medium">
                        {FIELD_LABELS[key] || key}:
                      </span>
                      <span className="text-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>

                {/* Review note */}
                <Textarea
                  placeholder="הערת סקירה (אופציונלי)"
                  value={processingId === req.id ? reviewNote : ''}
                  onChange={(e) => {
                    setProcessingId(req.id);
                    setReviewNote(e.target.value);
                  }}
                  rows={1}
                  className="text-xs text-right"
                  dir="rtl"
                />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => handleAction(req.id, 'approved')}
                    disabled={!!processingId && processingId !== req.id}
                  >
                    <Check className="w-3 h-3" />
                    אשר
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1 text-xs"
                    onClick={() => handleAction(req.id, 'rejected')}
                    disabled={!!processingId && processingId !== req.id}
                  >
                    <X className="w-3 h-3" />
                    דחה
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
