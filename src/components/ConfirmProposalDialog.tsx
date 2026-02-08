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
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ExportPDFButton } from '@/components/ui/ExportPDFButton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateProposalPDF, type ProposalPDFData } from '@/utils/generateProposalPDF';
import { useToast } from '@/hooks/use-toast';
import { 
  getFeeUnitLabel, 
  getChargeTypeLabel, 
  getDurationUnitLabel, 
  isRecurringChargeType 
} from '@/constants/rfpUnits';

interface FeeLineItem {
  id?: string;
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total: number;
  is_optional?: boolean;
  charge_type?: string;
  duration?: number;
}

interface MilestoneItem {
  id?: string;
  description: string;
  percentage: number;
}

interface ConfirmProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  price: string;
  timelineDays: string;
  fileCount: number;
  hasSignature: boolean;
  feeLineItems?: FeeLineItem[];
  milestones?: MilestoneItem[];
  projectName?: string;
  advisorName?: string;
  conditions?: {
    payment_terms?: string;
    assumptions?: string;
    exclusions?: string;
    validity_days?: number;
  };
  scopeText?: string;
}

const formatAmount = (amount: number) => {
  return `₪${amount.toLocaleString('he-IL')}`;
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
  conditions,
  scopeText,
}: ConfirmProposalDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const mandatoryItems = feeLineItems.filter(item => !item.is_optional);
  const optionalItems = feeLineItems.filter(item => item.is_optional);
  const totalMandatory = mandatoryItems.reduce((sum, item) => sum + item.total, 0);
  const totalOptional = optionalItems.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = totalMandatory + totalOptional;
  const displayTotal = grandTotal > 0 ? grandTotal : parseFloat(price || '0');
  const parsedTimelineDays = parseInt(timelineDays) || 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdfData: ProposalPDFData = {
        projectName,
        advisorName,
        submittedAt: new Date().toISOString(),
        price: parseFloat(price) || 0,
        timelineDays: parsedTimelineDays,
        feeItems: feeLineItems.map(item => ({
          description: item.description,
          unit: item.unit || 'פאושלי',
          quantity: item.quantity || 1,
          unitPrice: item.unit_price || item.total,
          total: item.total,
          isOptional: item.is_optional || false,
          chargeType: item.charge_type,
          duration: item.duration,
        })),
        milestones: milestones.map(m => ({
          description: m.description,
          percentage: m.percentage,
        })),
        conditions: conditions,
        scopeText: scopeText,
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

  const getItemKey = (item: FeeLineItem | MilestoneItem, idx: number) => {
    return item.id || `item-${idx}`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        className="max-w-2xl !h-[85vh] flex flex-col p-0" 
        dir="rtl"
      >
        <AlertDialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <AlertDialogTitle>סיכום לפני הגשת הצעה רשמית</AlertDialogTitle>
          <AlertDialogDescription>
            אנא בדקו את הפרטים הבאים לפני הגשת ההצעה. לאחר ההגשה לא ניתן לבטל.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="space-y-4 py-4">
            {/* Total Fee - Prominent Display */}
            <div className="p-4 border-2 rounded-lg bg-primary/5 border-primary/20" role="status">
              <Label className="text-muted-foreground text-xs">סה״כ שכר טרחה</Label>
              <p className="text-3xl font-bold text-primary mt-1">
                {formatAmount(displayTotal)}
              </p>
            </div>

            {/* Timeline Days */}
            {parsedTimelineDays > 0 && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-muted-foreground text-xs">לו״ז מוערך</Label>
                </div>
                <Badge variant="secondary">{parsedTimelineDays} ימים</Badge>
              </div>
            )}
            
            {/* Fee Line Items Breakdown - Mandatory */}
            {mandatoryItems.length > 0 && (
              <div className="p-4 border rounded-lg bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <Label className="text-muted-foreground text-xs mb-3 block font-semibold">פריטים כלולים (חובה)</Label>
                <div className="space-y-2">
                  {mandatoryItems.map((item, idx) => {
                    const isRecurring = item.charge_type && isRecurringChargeType(item.charge_type);
                    const durationLabel = item.charge_type ? getDurationUnitLabel(item.charge_type) : '';
                    
                    return (
                      <div 
                        key={getItemKey(item, idx)} 
                        className="flex justify-between items-start text-sm py-1 border-b border-muted last:border-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">{item.description}</span>
                          {isRecurring && item.duration && item.unit_price ? (
                            <span className="text-xs text-muted-foreground/70">
                              ₪{item.unit_price.toLocaleString('he-IL')}/{getChargeTypeLabel(item.charge_type!)} × {item.duration} {durationLabel}
                            </span>
                          ) : item.unit && item.quantity && item.quantity > 0 ? (
                            <span className="text-xs text-muted-foreground/70">
                              {item.quantity} × {getFeeUnitLabel(item.unit)}
                            </span>
                          ) : null}
                        </div>
                        <span className="font-medium">{formatAmount(item.total)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 font-semibold">
                    <span>סה״כ פריטי חובה</span>
                    <span className="text-primary">{formatAmount(totalMandatory)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Items */}
            {optionalItems.length > 0 && (
              <div className="p-4 border rounded-lg border-dashed bg-slate-50/30 dark:bg-slate-900/20">
                <Label className="text-muted-foreground text-xs mb-3 block font-semibold">פריטים נוספים (אופציונלי)</Label>
                <div className="space-y-2">
                  {optionalItems.map((item, idx) => {
                    const isRecurring = item.charge_type && isRecurringChargeType(item.charge_type);
                    const durationLabel = item.charge_type ? getDurationUnitLabel(item.charge_type) : '';
                    
                    return (
                      <div 
                        key={getItemKey(item, idx)} 
                        className="flex justify-between items-start text-sm py-1"
                      >
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">{item.description}</span>
                          {isRecurring && item.duration && item.unit_price ? (
                            <span className="text-xs text-muted-foreground/70">
                              ₪{item.unit_price.toLocaleString('he-IL')}/{getChargeTypeLabel(item.charge_type!)} × {item.duration} {durationLabel}
                            </span>
                          ) : item.unit && item.quantity && item.quantity > 0 ? (
                            <span className="text-xs text-muted-foreground/70">
                              {item.quantity} × {getFeeUnitLabel(item.unit)}
                            </span>
                          ) : null}
                        </div>
                        <span className="font-medium">{formatAmount(item.total)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 text-slate-600 dark:text-slate-400">
                    <span>סה״כ אופציונלי</span>
                    <span>{formatAmount(totalOptional)}</span>
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
                    <div 
                      key={getItemKey(milestone, idx)} 
                      className="flex justify-between items-center text-sm py-1 border-b border-muted last:border-0"
                    >
                      <span className="text-muted-foreground">{milestone.description}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{milestone.percentage}%</Badge>
                        <span className="font-medium">
                          {formatAmount(displayTotal * milestone.percentage / 100)}
                        </span>
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
              <Badge 
                variant={hasSignature ? "default" : "destructive"} 
                className="gap-1"
                aria-label={hasSignature ? "חתימה קיימת" : "חתימה חסרה"}
              >
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

            {/* VAT Disclaimer */}
            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
              * כל המחירים ללא מע״מ | הצעה תקפה ל-30 יום
            </p>
          </div>
        </ScrollArea>
        
        {/* Sticky Footer with RTL-compliant layout */}
        <AlertDialogFooter className="px-6 py-4 border-t bg-background flex-shrink-0" dir="rtl">
          <div className="flex w-full items-center justify-between">
            <ExportPDFButton 
              onClick={handleExportPDF} 
              loading={isExporting}
            />
            <div className="flex gap-2">
              <AlertDialogCancel>חזרה לעריכה</AlertDialogCancel>
              <AlertDialogAction 
                onClick={onConfirm} 
                className="bg-primary hover:bg-primary/90 font-bold"
              >
                הגש הצעת מחיר רשמית
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
