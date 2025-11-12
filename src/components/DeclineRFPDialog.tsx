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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

interface DeclineRFPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecline: (reason: string, note?: string) => Promise<void>;
  loading?: boolean;
}

const DECLINE_REASONS = [
  'לא רלוונטי למומחיות שלי',
  'עומס עבודה גבוה',
  'מיקום הפרויקט רחוק מדי',
  'תקציב נמוך מדי',
  'לוח זמנים לא מתאים',
  'אחר'
];

export function DeclineRFPDialog({
  open,
  onOpenChange,
  onDecline,
  loading = false
}: DeclineRFPDialogProps) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const { toast } = useToast();

  const handleDecline = async () => {
    if (!reason) {
      toast({
        title: 'נא לבחור סיבה',
        description: 'יש לבחור סיבה לדחיית ההזמנה',
        variant: 'destructive'
      });
      return;
    }

    try {
      await onDecline(reason, note || undefined);
      onOpenChange(false);
      setReason('');
      setNote('');
    } catch (error) {
      console.error('Error declining RFP:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            דחיית הזמנה להצעת מחיר
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <p>נשמח להבין מדוע אינכם יכולים להגיש הצעה לפרויקט זה</p>
              <p className="text-amber-600 font-medium text-sm flex items-center gap-1.5">
                <span className="inline-block">⚠️</span>
                שימו לב: פעולה זו אינה ניתנת לביטול
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>סיבת הדחייה *</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {DECLINE_REASONS.map((r) => (
                <div key={r} className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="font-normal cursor-pointer">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">הערות נוספות (אופציונלי)</Label>
            <Textarea
              id="note"
              placeholder="תוכלו להוסיף פרטים נוספים או המלצות ליועצים אחרים"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            ביטול
          </Button>
          <Button
            variant="destructive"
            onClick={handleDecline}
            disabled={loading || !reason}
          >
            {loading ? 'שולח...' : 'דחה הזמנה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
