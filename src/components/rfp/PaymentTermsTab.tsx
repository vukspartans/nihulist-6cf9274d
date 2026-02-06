import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Check, AlertCircle, Loader2, Database, TrendingUp } from 'lucide-react';
import { PaymentTerms, MilestonePayment, IndexType } from '@/types/rfpRequest';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { INDEX_TYPES, DEFAULT_INDEX_TYPE, getIndexLabel } from '@/constants/indexTypes';
import { PAYMENT_TERM_TYPES, PaymentTermType } from '@/constants/paymentTerms';

interface PaymentTermsTabProps {
  paymentTerms: PaymentTerms;
  onPaymentTermsChange: (terms: PaymentTerms) => void;
  advisorType?: string;
  defaultIndexType?: string;
  categoryId?: string;
}

// Get current month in YYYY-MM format
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const PaymentTermsTab = ({
  paymentTerms,
  onPaymentTermsChange,
  advisorType,
  defaultIndexType,
  categoryId
}: PaymentTermsTabProps) => {
  const { toast } = useToast();
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  
  // Set default index type when component mounts or defaultIndexType changes
  useEffect(() => {
    if (!paymentTerms.index_type) {
      onPaymentTermsChange({
        ...paymentTerms,
        index_type: (defaultIndexType as IndexType) || DEFAULT_INDEX_TYPE,
        index_base_month: getCurrentMonth()
      });
    }
  }, [defaultIndexType]);
  
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

  const loadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      let query = supabase
        .from('milestone_templates')
        .select('name, percentage_of_total, description')
        .eq('is_active', true)
        .order('display_order');
      
      // Filter by category_id first if provided (most specific)
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      } else if (advisorType) {
        // Fallback to advisor specialty filter
        query = query.or(`advisor_specialty.eq.${advisorType},advisor_specialty.is.null`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const milestones = data.map(m => ({
          description: m.name,
          percentage: m.percentage_of_total,
          trigger: m.description || m.name
        }));
        updateField('milestone_payments', milestones);
        toast({ 
          title: `נטענו ${data.length} אבני דרך מתבנית`,
          description: 'ניתן לערוך את האחוזים והתיאורים'
        });
      } else {
        // Fallback to hardcoded template
        updateField('milestone_payments', [
          { description: 'בחתימה על ההסכם', percentage: 30, trigger: 'בחתימה על ההסכם' },
          { description: 'עם קבלת היתר בנייה', percentage: 40, trigger: 'עם קבלת היתר בנייה' },
          { description: 'עם סיום התכנון', percentage: 30, trigger: 'עם סיום התכנון' }
        ]);
        toast({ 
          title: 'נטענה תבנית ברירת מחדל',
          description: 'לא נמצאו תבניות אבני דרך במערכת'
        });
      }
    } catch (error) {
      console.error('Error loading milestone templates:', error);
      // Fallback to hardcoded template on error
      updateField('milestone_payments', [
        { description: 'בחתימה על ההסכם', percentage: 30, trigger: 'בחתימה על ההסכם' },
        { description: 'עם קבלת היתר בנייה', percentage: 40, trigger: 'עם קבלת היתר בנייה' },
        { description: 'עם סיום התכנון', percentage: 30, trigger: 'עם סיום התכנון' }
      ]);
      toast({ 
        title: 'נטענה תבנית ברירת מחדל',
        variant: 'destructive'
      });
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Calculate total percentage (milestones only)
  const totalPercentage = (paymentTerms.milestone_payments || [])
    .reduce((sum, m) => sum + (m.percentage || 0), 0);
  
  const isComplete = totalPercentage === 100;
  const milestones = paymentTerms.milestone_payments || [];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Milestones Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-right font-medium">אבני דרך לתשלום</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadTemplate}
            disabled={loadingTemplate}
            className="h-7 text-xs gap-1"
          >
            {loadingTemplate ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Database className="h-3 w-3" />
            )}
            {loadingTemplate ? 'טוען...' : 'טען תבנית'}
          </Button>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_40px] gap-2 p-2 bg-muted/50 border-b text-sm font-medium">
            <div className="text-right">אבן דרך</div>
            <div className="text-center">אחוז</div>
            <div></div>
          </div>
          
          {/* Milestone Rows */}
          {milestones.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground text-sm">
              לחצו על "הוסף אבן דרך" או "תבנית נפוצה"
            </div>
          ) : (
            <div className="divide-y">
              {milestones.map((milestone, index) => (
                <div key={index} className="grid grid-cols-[1fr_100px_40px] gap-2 p-2 items-center">
                  <Input
                    value={milestone.trigger || milestone.description || ''}
                    onChange={(e) => {
                      updateMilestone(index, 'trigger', e.target.value);
                      updateMilestone(index, 'description', e.target.value);
                    }}
                    placeholder="תיאור אבן הדרך"
                    className="text-right h-8"
                    dir="rtl"
                  />
                  <div className="flex items-center gap-1 justify-center">
                    <Input
                      type="number"
                      value={milestone.percentage || ''}
                      onChange={(e) => updateMilestone(index, 'percentage', Number(e.target.value) || 0)}
                      className="text-center h-8 w-16"
                      min={0}
                      max={100}
                      dir="ltr"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMilestone(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Footer with Add Button and Total */}
          <div className="grid grid-cols-[1fr_100px_40px] gap-2 p-2 bg-muted/30 border-t items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addMilestone}
              className="h-7 justify-start gap-1 text-primary hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              הוסף אבן דרך
            </Button>
            <div className={`flex items-center justify-center gap-1 text-sm font-medium ${
              isComplete ? 'text-green-600' : totalPercentage > 100 ? 'text-destructive' : 'text-amber-600'
            }`}>
              {totalPercentage}%
              {isComplete ? (
                <Check className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
            </div>
            <div></div>
          </div>
        </div>
        
        {!isComplete && milestones.length > 0 && (
          <p className={`text-xs ${totalPercentage > 100 ? 'text-destructive' : 'text-amber-600'}`}>
            {totalPercentage > 100 
              ? `סה"כ ${totalPercentage}% - יש להפחית ${totalPercentage - 100}%`
              : `חסרים ${100 - totalPercentage}% להשלמת 100%`
            }
          </p>
        )}
      </div>

      {/* Payment Terms Dropdown */}
      <div className="space-y-1">
        <Label className="text-right block">תנאי תשלום</Label>
        <Select
          dir="rtl"
          value={paymentTerms.payment_term_type || ''}
          onValueChange={(v) => updateField('payment_term_type', v as PaymentTermType)}
        >
          <SelectTrigger dir="rtl" className="w-full text-right">
            <SelectValue placeholder="בחרו תנאי תשלום" />
          </SelectTrigger>
          <SelectContent dir="rtl" align="end">
            {PAYMENT_TERM_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-right">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Index Type Section */}
      <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4 text-primary" />
          הצמדת מדד
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Index Type Selection */}
          <div className="space-y-1.5">
            <Label className="text-sm">סוג המדד</Label>
            <Select
              dir="rtl"
              value={paymentTerms.index_type || DEFAULT_INDEX_TYPE}
              onValueChange={(v) => updateField('index_type', v as IndexType)}
            >
              <SelectTrigger dir="rtl" className="text-right">
                <SelectValue placeholder="בחר מדד" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {INDEX_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-right">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Index Base Value */}
          <div className="space-y-1.5">
            <Label className="text-sm">ערך מדד בסיס</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={paymentTerms.index_base_value || ''}
                onChange={(e) => updateField('index_base_value', Number(e.target.value) || undefined)}
                placeholder="לדוגמה: 108.5"
                className="text-right"
                dir="ltr"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {paymentTerms.index_base_month || getCurrentMonth()}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          ערך המדד הוא ערך המדד של חודש הגשת ההצעה. בעת הגשת חשבון, המערכת תחשב את ההפרש בין מדד הבסיס למדד החודש הנוכחי.
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-right block">הערות נוספות</Label>
        <Textarea
          value={paymentTerms.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={2}
          className="text-right min-h-[60px]"
          dir="rtl"
          placeholder='לדוגמא: "המזמין שומר לעצמו את הזכות להעסיק את שירותי המשרד לחלק מהפרויקטים ובמועדים שונים, אך לא יותר מ- 6 חודשים מיום הגשת הצעת המחיר."'
        />
      </div>
    </div>
  );
};
