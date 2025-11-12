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
  const [showSuccess, setShowSuccess] = useState(false);
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
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setReason('');
        setNote('');
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error declining RFP:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && reason && !loading) {
      e.preventDefault();
      handleDecline();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-4" 
        dir="rtl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            דחיית הזמנה להצעת מחיר
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-3">
              <p>נשמח להבין מדוע אינכם יכולים להגיש הצעה לפרויקט זה</p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-800 font-semibold text-sm flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  שימו לב: פעולה זו אינה ניתנת לביטול
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>סיבת הדחייה *</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {DECLINE_REASONS.map((r) => (
                <div key={r} className="flex items-center gap-2 flex-row-reverse justify-end">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="font-normal cursor-pointer flex-1 py-2">
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
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-left">
              {note.length}/500 תווים
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:flex-row-reverse flex-col-reverse">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            ביטול
          </Button>
          <Button
            variant="destructive"
            onClick={handleDecline}
            disabled={loading || !reason}
            className="w-full sm:w-auto"
          >
            {loading ? 'שולח...' : 'דחה הזמנה'}
          </Button>
        </DialogFooter>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">שולח...</p>
            </div>
          </div>
        )}

        {/* Success state */}
        {showSuccess && (
          <div className="absolute inset-0 bg-background/95 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✓</span>
              </div>
              <p className="text-sm font-medium">ההזמנה נדחתה בהצלחה</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
