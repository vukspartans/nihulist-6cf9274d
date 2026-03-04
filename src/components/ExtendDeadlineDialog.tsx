import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ExtendDeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfpIds: string[];
  advisorType: string;
  projectId: string;
  currentDeadline: string;
}

const EXTENSION_OPTIONS = [
  { value: '24', label: '24 שעות' },
  { value: '48', label: '48 שעות' },
  { value: '72', label: '72 שעות' },
  { value: '168', label: 'שבוע' },
];

export function ExtendDeadlineDialog({
  open,
  onOpenChange,
  rfpIds,
  advisorType,
  projectId,
  currentDeadline,
}: ExtendDeadlineDialogProps) {
  const [hours, setHours] = useState('48');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleExtend = async () => {
    setIsLoading(true);
    try {
      const extensionMs = parseInt(hours) * 60 * 60 * 1000;

      // Step 1: Fetch all matching non-terminal invites with their current deadlines
      const { data: invites, error: fetchError } = await supabase
        .from('rfp_invites')
        .select('id, deadline_at')
        .in('rfp_id', rfpIds)
        .eq('advisor_type', advisorType)
        .not('status', 'in', '("submitted","declined","expired")');

      if (fetchError) throw fetchError;
      if (!invites || invites.length === 0) {
        toast.info('לא נמצאו הזמנות פעילות להארכה');
        onOpenChange(false);
        return;
      }

      // Step 2: Update each invite relative to its own deadline
      const updates = invites.map(invite => {
        const currentDl = invite.deadline_at ? new Date(invite.deadline_at).getTime() : Date.now();
        const newDeadline = new Date(currentDl + extensionMs).toISOString();
        return supabase
          .from('rfp_invites')
          .update({ deadline_at: newDeadline })
          .eq('id', invite.id);
      });

      const results = await Promise.all(updates);
      const failed = results.filter(r => r.error);
      if (failed.length > 0) {
        console.error('Some updates failed:', failed.map(r => r.error));
        throw failed[0].error;
      }

      toast.success(`המועד האחרון הוארך ב-${EXTENSION_OPTIONS.find(o => o.value === hours)?.label} (${invites.length} הזמנות)`);
      queryClient.invalidateQueries({ queryKey: ['rfp-invites-by-advisor-type', projectId] });
      onOpenChange(false);
    } catch (err) {
      console.error('Error extending deadline:', err);
      toast.error('שגיאה בהארכת המועד האחרון');
    } finally {
      setIsLoading(false);
    }
  };

  const newDeadline = new Date(new Date(currentDeadline).getTime() + parseInt(hours) * 60 * 60 * 1000);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            הארכת מועד אחרון
          </DialogTitle>
          <DialogDescription>
            הארך את המועד האחרון להגשה עבור כל היועצים מסוג "{advisorType}" שטרם הגישו הצעה. כל הזמנה תוארך ביחס למועד הנוכחי שלה.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">משך הארכה</label>
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTENSION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
            <div>
              <span className="font-medium">מועד מוקדם ביותר (נוכחי): </span>
              {new Date(currentDeadline).toLocaleString('he-IL')}
            </div>
            <div>
              <span className="font-medium">מועד מוקדם ביותר (חדש): </span>
              {newDeadline.toLocaleString('he-IL')}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            ביטול
          </Button>
          <Button onClick={handleExtend} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            הארך מועד
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
