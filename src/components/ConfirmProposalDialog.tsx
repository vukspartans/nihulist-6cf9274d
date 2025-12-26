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
import { ScrollArea } from '@/components/ui/scroll-area';

interface FeeLineItem {
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total: number;
  is_optional?: boolean;
}

interface MilestoneItem {
  description: string;
  percentage: number;
}

interface ConfirmProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  price: string;
  timelineDays: string;
  scopeText: string;
  fileCount: number;
  hasSignature: boolean;
  feeLineItems?: FeeLineItem[];
  milestones?: MilestoneItem[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
  }).format(amount);
};

export function ConfirmProposalDialog({
  open,
  onOpenChange,
  onConfirm,
  price,
  timelineDays,
  scopeText,
  fileCount,
  hasSignature,
  feeLineItems = [],
  milestones = [],
}: ConfirmProposalDialogProps) {
  const mandatoryItems = feeLineItems.filter(item => !item.is_optional);
  const optionalItems = feeLineItems.filter(item => item.is_optional);
  const totalMandatory = mandatoryItems.reduce((sum, item) => sum + item.total, 0);
  const totalOptional = optionalItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0" dir="rtl">
        <AlertDialogHeader className="px-6 pt-6 pb-2">
          <AlertDialogTitle>סקירה אחרונה לפני הגשה</AlertDialogTitle>
          <AlertDialogDescription>
            אנא בדקו את הפרטים הבאים לפני הגשת ההצעה
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
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
            
            {/* Fee Line Items Breakdown */}
            {mandatoryItems.length > 0 && (
              <div className="p-4 border rounded-lg">
                <Label className="text-muted-foreground text-xs mb-3 block">פירוט שכר טרחה</Label>
                <div className="space-y-2">
                  {mandatoryItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-muted last:border-0">
                      <span className="text-muted-foreground">{item.description}</span>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 font-semibold">
                    <span>סה״כ</span>
                    <span className="text-primary">{formatCurrency(totalMandatory)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Items */}
            {optionalItems.length > 0 && (
              <div className="p-4 border rounded-lg border-dashed">
                <Label className="text-muted-foreground text-xs mb-3 block">פריטים אופציונליים</Label>
                <div className="space-y-2">
                  {optionalItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-1">
                      <span className="text-muted-foreground">{item.description}</span>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 text-muted-foreground">
                    <span>סה״כ אופציונלי</span>
                    <span>{formatCurrency(totalOptional)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Milestones */}
            {milestones.length > 0 && (
              <div className="p-4 border rounded-lg">
                <Label className="text-muted-foreground text-xs mb-3 block">אבני דרך לתשלום</Label>
                <div className="space-y-2">
                  {milestones.map((milestone, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-muted last:border-0">
                      <span className="text-muted-foreground">{milestone.description}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{milestone.percentage}%</Badge>
                        <span className="font-medium">{formatCurrency(parseFloat(price || '0') * milestone.percentage / 100)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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
        </ScrollArea>
        
        {/* Sticky Footer */}
        <AlertDialogFooter className="px-6 py-4 border-t bg-background">
          <AlertDialogCancel>חזרה לעריכה</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            אישור והגשת הצעה
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
