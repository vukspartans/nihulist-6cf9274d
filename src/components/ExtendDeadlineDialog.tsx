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

      // Update all non-terminal invites for these RFPs with matching advisor_type
      const { error, count } = await supabase
        .from('rfp_invites')
        .update({
          deadline_at: new Date(new Date(currentDeadline).getTime() + extensionMs).toISOString(),
        })
        .in('rfp_id', rfpIds)
        .eq('advisor_type', advisorType)
        .not('status', 'in', '("submitted","declined","expired")');

      if (error) throw error;

      toast.success(`המועד האחרון הוארך ב-${EXTENSION_OPTIONS.find(o => o.value === hours)?.label}`);
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
            הארך את המועד האחרון להגשה עבור כל היועצים מסוג "{advisorType}" שטרם הגישו הצעה.
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
              <span className="font-medium">מועד נוכחי: </span>
              {new Date(currentDeadline).toLocaleString('he-IL')}
            </div>
            <div>
              <span className="font-medium">מועד חדש: </span>
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
