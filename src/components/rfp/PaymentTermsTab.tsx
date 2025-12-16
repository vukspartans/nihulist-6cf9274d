import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2 } from 'lucide-react';
import { PaymentTerms, MilestonePayment } from '@/types/rfpRequest';
import { PAYMENT_MILESTONES_TEMPLATES } from '@/constants/rfpUnits';

interface PaymentTermsTabProps {
  paymentTerms: PaymentTerms;
  onPaymentTermsChange: (terms: PaymentTerms) => void;
}

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

  const updateMilestone = (index: number, field: keyof MilestonePayment, value: any) => {
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
    <div className="space-y-6">
      {/* Quick Template */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
        <span className="text-sm text-muted-foreground">
          טען תבנית תשלומים נפוצה
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadTemplate}
        >
          טען תבנית
        </Button>
      </div>

      {/* Advance Payment */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">מקדמה בחתימה</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[paymentTerms.advance_percent || 0]}
            onValueChange={([value]) => updateField('advance_percent', value)}
            max={50}
            step={5}
            className="flex-1"
          />
          <div className="w-20 text-center">
            <span className="text-lg font-bold">{paymentTerms.advance_percent || 0}%</span>
          </div>
        </div>
      </div>

      {/* Milestone Payments */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">אבני דרך לתשלום</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMilestone}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            הוסף אבן דרך
          </Button>
        </div>

        <div className="space-y-3">
          {(paymentTerms.milestone_payments || []).map((milestone, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border"
            >
              <Input
                value={milestone.trigger || ''}
                onChange={(e) => updateMilestone(index, 'trigger', e.target.value)}
                placeholder="מתי (לדוגמה: עם קבלת היתר)"
                className="flex-1 text-right"
                dir="rtl"
              />
              <div className="flex items-center gap-2 w-32">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={milestone.percentage || ''}
                  onChange={(e) => updateMilestone(index, 'percentage', Number(e.target.value) || 0)}
                  className="w-20 text-center"
                />
                <span className="text-muted-foreground">%</span>
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
      <div className={`p-4 rounded-lg border ${totalPercentage === 100 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">סה"כ תשלומים:</span>
          <span className={`text-xl font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-amber-600'}`}>
            {totalPercentage}%
          </span>
        </div>
        {totalPercentage !== 100 && (
          <p className="text-sm text-amber-600 mt-1">
            סך התשלומים צריך להיות 100%
          </p>
        )}
      </div>

      {/* Payment Due Days */}
      <div className="space-y-2">
        <Label>ימי תשלום (שוטף +)</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">שוטף +</span>
          <Input
            type="number"
            min="0"
            max="90"
            value={paymentTerms.payment_due_days || ''}
            onChange={(e) => updateField('payment_due_days', Number(e.target.value) || undefined)}
            placeholder="30"
            className="w-24 text-center"
          />
          <span className="text-muted-foreground">יום</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>הערות לתנאי תשלום</Label>
        <Textarea
          value={paymentTerms.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="text-right"
          dir="rtl"
          placeholder="הערות נוספות לגבי תנאי התשלום..."
        />
      </div>
    </div>
  );
};
