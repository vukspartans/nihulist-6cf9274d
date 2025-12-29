import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Download, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateProposalPDF, type ProposalPDFData } from '@/utils/generateProposalPDF';
import { useToast } from '@/hooks/use-toast';

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
  projectName?: string;
  advisorName?: string;
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
  fileCount,
  hasSignature,
  feeLineItems = [],
  milestones = [],
  projectName = 'פרויקט',
  advisorName = 'יועץ',
}: ConfirmProposalDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const mandatoryItems = feeLineItems.filter(item => !item.is_optional);
  const optionalItems = feeLineItems.filter(item => item.is_optional);
  const totalMandatory = mandatoryItems.reduce((sum, item) => sum + item.total, 0);
  const totalOptional = optionalItems.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = totalMandatory + totalOptional;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdfData: ProposalPDFData = {
        projectName,
        advisorName,
        submittedAt: new Date().toISOString(),
        price: parseFloat(price) || 0,
        timelineDays: parseInt(timelineDays) || 0,
        feeItems: feeLineItems.map(item => ({
          description: item.description,
          unit: item.unit || 'פאושלי',
          quantity: item.quantity || 1,
          unitPrice: item.unit_price || item.total,
          total: item.total,
          isOptional: item.is_optional || false,
        })),
        milestones: milestones.map(m => ({
          description: m.description,
          percentage: m.percentage,
        })),
      };
      
      await generateProposalPDF(pdfData);
      toast({
        title: "PDF נוצר בהצלחה",
        description: "חלון ההדפסה נפתח",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "שגיאה בייצוא PDF",
        description: "אנא נסו שוב",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

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
            {/* Total Fee - Prominent Display */}
            <div className="p-4 border-2 rounded-lg bg-primary/5 border-primary/20">
              <Label className="text-muted-foreground text-xs">סה״כ שכר טרחה</Label>
              <p className="text-3xl font-bold text-primary mt-1">
                {formatCurrency(grandTotal > 0 ? grandTotal : parseFloat(price || '0'))}
              </p>
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
                    <span>סה״כ פריטים עיקריים</span>
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
                        <span className="font-medium">{formatCurrency((grandTotal > 0 ? grandTotal : parseFloat(price || '0')) * milestone.percentage / 100)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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
        <AlertDialogFooter className="px-6 py-4 border-t bg-background flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            ייצוא ל-PDF
          </Button>
          <div className="flex gap-2">
            <AlertDialogCancel>חזרה לעריכה</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              אישור והגשת הצעה
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}