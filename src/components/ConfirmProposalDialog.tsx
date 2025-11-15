import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ConfirmProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  price: string;
  timelineDays: string;
  scopeText: string;
  fileCount: number;
  hasSignature: boolean;
}

export function ConfirmProposalDialog({
  open,
  onOpenChange,
  onConfirm,
  price,
  timelineDays,
  scopeText,
  fileCount,
  hasSignature
}: ConfirmProposalDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>סקירה אחרונה לפני הגשה</AlertDialogTitle>
          <AlertDialogDescription>
            אנא בדקו את הפרטים הבאים לפני הגשת ההצעה
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <Label className="text-muted-foreground text-xs">מחיר מוצע</Label>
              <p className="text-2xl font-bold mt-1">₪{parseFloat(price || '0').toLocaleString()}</p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/50">
              <Label className="text-muted-foreground text-xs">זמן ביצוע</Label>
              <p className="text-2xl font-bold mt-1">{timelineDays} ימים</p>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <Label className="text-muted-foreground text-xs mb-2 block">היקף העבודה</Label>
            <p className="text-sm line-clamp-4">{scopeText}</p>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label className="text-muted-foreground text-xs">קבצים מצורפים</Label>
            <Badge variant="secondary">{fileCount} קבצים</Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label className="text-muted-foreground text-xs">חתימה דיגיטלית</Label>
            <Badge variant={hasSignature ? "default" : "destructive"} className="gap-1">
              {hasSignature ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  נחתם
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  לא נחתם
                </>
              )}
            </Badge>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>חזרה לעריכה</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            אישור והגשת הצעה
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
