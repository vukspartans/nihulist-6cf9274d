import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarClock } from 'lucide-react';
import type { RescheduleProposal, ProposedChange } from '@/hooks/useRescheduleProposals';

interface RescheduleReviewDialogProps {
  proposal: RescheduleProposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (proposalId: string, changes: ProposedChange[]) => void;
}

export function RescheduleReviewDialog({ proposal, open, onOpenChange, onAccept }: RescheduleReviewDialogProps) {
  const [editedChanges, setEditedChanges] = useState<ProposedChange[]>([]);

  useEffect(() => {
    if (proposal) {
      setEditedChanges([...proposal.proposed_changes]);
    }
  }, [proposal]);

  if (!proposal) return null;

  const updateChange = (index: number, field: 'new_start' | 'new_end', value: string) => {
    setEditedChanges(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value || null };
      return next;
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('he-IL');
    } catch { return d; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <CalendarClock className="w-5 h-5 text-orange-600" />
            הצעה לעדכון לוח זמנים
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            המשימה <strong>&quot;{proposal.trigger_task_name}&quot;</strong> מעוכבת ב-
            <strong>{proposal.delay_days}</strong> ימים.
            להלן התאריכים המוצעים עבור {editedChanges.length} משימות תלויות:
          </p>

          <div className="border rounded-md overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם משימה</TableHead>
                  <TableHead className="text-right">התחלה מקורית</TableHead>
                  <TableHead className="text-right">התחלה מוצעת</TableHead>
                  <TableHead className="text-right">סיום מקורי</TableHead>
                  <TableHead className="text-right">סיום מוצע</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedChanges.map((change, idx) => (
                  <TableRow key={change.task_id}>
                    <TableCell className="font-medium text-right">{change.task_name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(change.old_start)}</TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={change.new_start || ''}
                        onChange={e => updateChange(idx, 'new_start', e.target.value)}
                        className="h-8 w-[140px]"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(change.old_end)}</TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={change.new_end || ''}
                        onChange={e => updateChange(idx, 'new_end', e.target.value)}
                        className="h-8 w-[140px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            בטל
          </Button>
          <Button onClick={() => onAccept(proposal.id, editedChanges)}>
            אשר עדכון
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
