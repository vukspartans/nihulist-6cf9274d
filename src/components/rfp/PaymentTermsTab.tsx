import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { PaymentTerms, MilestonePayment, PaymentTermType } from '@/types/rfpRequest';
import { PAYMENT_MILESTONES_TEMPLATES } from '@/constants/rfpUnits';

interface PaymentTermsTabProps {
  paymentTerms: PaymentTerms;
  onPaymentTermsChange: (terms: PaymentTerms) => void;
}

const PAYMENT_TERM_OPTIONS: { value: PaymentTermType; label: string }[] = [
  { value: 'current', label: 'שוטף' },
  { value: 'net_30', label: 'שוטף + 30' },
  { value: 'net_60', label: 'שוטף + 60' },
  { value: 'net_90', label: 'שוטף + 90' },
];

export const PaymentTermsTab = ({
  paymentTerms,
  onPaymentTermsChange
}: PaymentTermsTabProps) => {
  
  const updateField = <K extends keyof PaymentTerms>(field: K, value: PaymentTerms[K]) => {
    onPaymentTermsChange({
      ...paymentTerms,
      [field]: value
    });
  };

  const addMilestone = () => {
    const newMilestone: MilestonePayment = {
      description: '',
      percentage: 0,
      trigger: ''
    };
    
    updateField('milestone_payments', [
      ...(paymentTerms.milestone_payments || []),
      newMilestone
    ]);
  };

  const removeMilestone = (index: number) => {
    const newMilestones = (paymentTerms.milestone_payments || []).filter((_, i) => i !== index);
    updateField('milestone_payments', newMilestones);
  };

  const updateMilestone = (index: number, field: keyof MilestonePayment, value: string | number) => {
    const newMilestones = [...(paymentTerms.milestone_payments || [])];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    updateField('milestone_payments', newMilestones);
  };

  const loadTemplate = () => {
    const templateMilestones: MilestonePayment[] = PAYMENT_MILESTONES_TEMPLATES.map(t => ({
      description: t.trigger,
      percentage: t.default_percent,
      trigger: t.trigger
    }));
    
    updateField('advance_percent', 20);
    updateField('milestone_payments', templateMilestones.slice(1)); // Skip first (advance) as it's separate
  };

  const totalPercentage = (paymentTerms.advance_percent || 0) + 
    (paymentTerms.milestone_payments || []).reduce((sum, m) => sum + (m.percentage || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Quick Template */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border flex-row-reverse">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadTemplate}
        >
          טען תבנית
        </Button>
        <span className="text-sm text-muted-foreground text-right">
          טען תבנית תשלומים נפוצה
        </span>
      </div>

      {/* Advance Payment */}
      <div className="space-y-3">
        <Label className="text-base font-semibold text-right block">מקדמה בחתימה</Label>
        <div className="flex items-center gap-4 flex-row-reverse">
          <div className="w-20 text-center">
            <span className="text-lg font-bold">{paymentTerms.advance_percent || 0}%</span>
          </div>
          <Slider
            value={[paymentTerms.advance_percent || 0]}
            onValueChange={([value]) => updateField('advance_percent', value)}
            max={50}
            step={5}
            className="flex-1"
            dir="ltr"
          />
        </div>
      </div>

      {/* Milestone Payments - Row-based */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-row-reverse">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMilestone}
            className="flex items-center gap-2 flex-row-reverse"
          >
            <Plus className="h-4 w-4" />
            הוסף אבן דרך
          </Button>
          <Label className="text-base font-semibold text-right">אבני דרך לתשלום</Label>
        </div>

        <div className="space-y-2">
          {(paymentTerms.milestone_payments || []).map((milestone, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border flex-row-reverse"
            >
              <Input
                value={milestone.trigger || ''}
                onChange={(e) => updateMilestone(index, 'trigger', e.target.value)}
                placeholder="אבן דרך (לדוגמה: עם קבלת היתר)"
                className="flex-1 text-right"
                dir="rtl"
              />
              <div className="flex items-center gap-2 w-28 flex-row-reverse">
                <span className="text-muted-foreground">%</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={milestone.percentage || ''}
                  onChange={(e) => updateMilestone(index, 'percentage', Number(e.target.value) || 0)}
                  className="w-20 text-center"
                  dir="ltr"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMilestone(index)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {(paymentTerms.milestone_payments || []).length === 0 && (
            <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
              לחץ על "הוסף אבן דרך" להוספת תשלומים לפי שלבי הפרויקט
            </div>
          )}
        </div>
      </div>

      {/* Total Check */}
      <div className={`p-4 rounded-lg border ${totalPercentage === 100 ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'}`}>
        <div className="flex items-center justify-between flex-row-reverse">
          <span className={`text-xl font-bold ${totalPercentage === 100 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {totalPercentage}%
          </span>
          <span className="font-medium">סה"כ תשלומים:</span>
        </div>
        {totalPercentage !== 100 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 text-right">
            סך התשלומים צריך להיות 100%
          </p>
        )}
      </div>

      {/* Payment Terms Dropdown */}
      <div className="space-y-2">
        <Label className="text-right block">תנאי תשלום</Label>
        <Select
          value={paymentTerms.payment_term_type || ''}
          onValueChange={(v) => updateField('payment_term_type', v as PaymentTermType)}
        >
          <SelectTrigger className="w-full text-right" dir="rtl">
            <SelectValue placeholder="בחרו תנאי תשלום" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_TERM_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-right block">הערות נוספות</Label>
        <Textarea
          value={paymentTerms.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="text-right"
          dir="rtl"
          placeholder="לדוגמא: המזמין שומר לעצמו את הזכות להעסיק את שירותי המשרד לחלק מהפרויקטים ובמועדים שונים, אך לא יותר מ- 6 חודשים מיום הגשת הצעת המחיר."
        />
      </div>
    </div>
  );
};
