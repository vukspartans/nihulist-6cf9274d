import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMilestone, PaymentRequest } from '@/types/payment';
import { getIndexLabel, INDEX_TYPES } from '@/constants/indexTypes';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProjectAdvisor {
  id: string;
  advisor_id: string;
  fee_amount: number;
  advisors: {
    id: string;
    company_name: string | null;
  };
}

interface IndexTerms {
  index_type: string;
  index_base_value: number | null;
  index_base_month: string | null;
}

interface CreatePaymentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestones: PaymentMilestone[];
  preselectedMilestone?: PaymentMilestone | null;
  onSubmit: (request: Partial<PaymentRequest>) => Promise<any>;
}

export function CreatePaymentRequestDialog({ 
  open, 
  onOpenChange, 
  projectId,
  milestones,
  preselectedMilestone,
  onSubmit 
}: CreatePaymentRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [projectAdvisors, setProjectAdvisors] = useState<ProjectAdvisor[]>([]);
  const [indexTerms, setIndexTerms] = useState<IndexTerms | null>(null);
  const [indexCurrentValue, setIndexCurrentValue] = useState('');
  const [incompleteTasksWarning, setIncompleteTasksWarning] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    vat_percent: '17',
    project_advisor_id: '',
    payment_milestone_id: '',
    category: 'consultant',
    notes: '',
    external_party_name: '',
  });

  const amount = parseFloat(formData.amount) || 0;
  const vatPercent = parseFloat(formData.vat_percent) || 0;
  
  // Index calculation
  const currentIndexVal = parseFloat(indexCurrentValue) || 0;
  const hasIndex = indexTerms && indexTerms.index_type !== 'none' && indexTerms.index_base_value && indexTerms.index_base_value > 0;
  const adjustmentFactor = hasIndex && currentIndexVal > 0 ? currentIndexVal / indexTerms.index_base_value! : null;
  const adjustedAmount = adjustmentFactor ? amount * adjustmentFactor : amount;
  
  const vatAmount = adjustedAmount * (vatPercent / 100);
  const totalAmount = adjustedAmount + vatAmount;

  // Fetch index terms when advisor changes
  useEffect(() => {
    const fetchIndexTerms = async () => {
      if (!formData.project_advisor_id) {
        setIndexTerms(null);
        return;
      }

      // Get proposal -> rfp_invite -> payment_terms for this advisor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: proposal } = await (supabase as any)
        .from('proposals')
        .select('rfp_invite_id')
        .eq('project_advisor_id', formData.project_advisor_id)
        .limit(1)
        .maybeSingle();

      if (!proposal?.rfp_invite_id) {
        setIndexTerms(null);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invite } = await (supabase as any)
        .from('rfp_invites')
        .select('payment_terms')
        .eq('id', proposal.rfp_invite_id)
        .maybeSingle();

      if (invite?.payment_terms) {
        const terms = invite.payment_terms as any;
        if (terms.index_type && terms.index_type !== 'none') {
          setIndexTerms({
            index_type: terms.index_type,
            index_base_value: terms.index_base_value || null,
            index_base_month: terms.index_base_month || null,
          });
        } else {
          setIndexTerms(null);
        }
      } else {
        setIndexTerms(null);
      }
    };

    if (open) fetchIndexTerms();
  }, [formData.project_advisor_id, open]);

  useEffect(() => {
    const fetchProjectAdvisors = async () => {
      const { data } = await supabase
        .from('project_advisors')
        .select(`
          id,
          advisor_id,
          fee_amount,
          advisors:advisors!fk_project_advisors_advisor (
            id,
            company_name
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'active');
      
      setProjectAdvisors((data as ProjectAdvisor[]) || []);
    };

    if (open) {
      fetchProjectAdvisors();
      
      if (preselectedMilestone) {
        setFormData(prev => ({
          ...prev,
          amount: preselectedMilestone.amount.toString(),
          payment_milestone_id: preselectedMilestone.id,
          project_advisor_id: preselectedMilestone.project_advisor_id || '',
        }));
      }
    }
  }, [projectId, open, preselectedMilestone]);

  const handleMilestoneChange = (milestoneId: string) => {
    setIncompleteTasksWarning(null);
    const milestone = milestones.find(m => m.id === milestoneId);
    if (milestone) {
      setFormData(prev => ({
        ...prev,
        payment_milestone_id: milestoneId,
        amount: milestone.amount.toString(),
        project_advisor_id: milestone.project_advisor_id || prev.project_advisor_id,
      }));
    } else {
      setFormData(prev => ({ ...prev, payment_milestone_id: milestoneId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncompleteTasksWarning(null);
    setLoading(true);
    
    try {
      // Validate: block if linked milestone has incomplete critical tasks
      if (formData.payment_milestone_id) {
        const { data: incompleteTasks } = await supabase
          .from('project_tasks')
          .select('name, status')
          .eq('payment_milestone_id', formData.payment_milestone_id)
          .eq('is_payment_critical', true)
          .not('status', 'in', '("completed","cancelled")');

        if (incompleteTasks && incompleteTasks.length > 0) {
          const names = incompleteTasks.map(t => t.name).join(', ');
          setIncompleteTasksWarning(`לא ניתן להגיש חשבון: משימות קריטיות לא הושלמו — ${names}`);
          setLoading(false);
          return;
        }
      }
      const submitData: Partial<PaymentRequest> = {
        amount: parseFloat(formData.amount),
        vat_percent: parseFloat(formData.vat_percent),
        project_advisor_id: formData.project_advisor_id || null,
        payment_milestone_id: formData.payment_milestone_id || null,
        category: formData.category as 'consultant' | 'external' | 'other',
        notes: formData.notes || null,
        external_party_name: formData.category === 'external' ? formData.external_party_name : null,
      };

      // Add index data if applicable
      if (hasIndex && adjustmentFactor) {
        submitData.index_type = indexTerms!.index_type;
        submitData.index_base_value = indexTerms!.index_base_value;
        submitData.index_current_value = currentIndexVal;
        submitData.index_adjustment_factor = adjustmentFactor;
        submitData.index_adjusted_amount = adjustedAmount;
      }

      await onSubmit(submitData);
      
      setFormData({
        amount: '',
        vat_percent: '17',
        project_advisor_id: '',
        payment_milestone_id: '',
        category: 'consultant',
        notes: '',
        external_party_name: '',
      });
      setIndexCurrentValue('');
      setIndexTerms(null);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const adjustmentPercent = adjustmentFactor ? ((adjustmentFactor - 1) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>בקשת תשלום חדשה</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>קטגוריה</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultant">יועץ</SelectItem>
                <SelectItem value="external">גורם חיצוני</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.category === 'consultant' && (
            <>
              <div className="space-y-2">
                <Label>אבן דרך</Label>
                <Select 
                  value={formData.payment_milestone_id} 
                  onValueChange={handleMilestoneChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר אבן דרך (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    {milestones
                      .filter(m => m.status !== 'paid')
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} - {formatCurrency(m.amount)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>יועץ</Label>
                <Select 
                  value={formData.project_advisor_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, project_advisor_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר יועץ" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectAdvisors.map((pa) => (
                      <SelectItem key={pa.id} value={pa.id}>
                        {pa.advisors?.company_name || 'יועץ'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {formData.category === 'external' && (
            <div className="space-y-2">
              <Label htmlFor="external_party_name">שם הגורם החיצוני *</Label>
              <Input
                id="external_party_name"
                value={formData.external_party_name}
                onChange={(e) => setFormData(prev => ({ ...prev, external_party_name: e.target.value }))}
                placeholder="שם הספק או הגורם"
                required={formData.category === 'external'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">סכום לפני מע״מ (₪) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_percent">מע״מ (%)</Label>
              <Input
                id="vat_percent"
                type="number"
                value={formData.vat_percent}
                onChange={(e) => setFormData(prev => ({ ...prev, vat_percent: e.target.value }))}
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Index Adjustment Section */}
          {hasIndex && amount > 0 && (
            <div className="border rounded-lg p-3 space-y-3 bg-accent/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>הצמדת מדד</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">סוג מדד</Label>
                  <p className="font-medium">{getIndexLabel(indexTerms!.index_type)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ערך מדד בסיס</Label>
                  <p className="font-medium">{indexTerms!.index_base_value}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="index_current" className="text-sm">ערך מדד נוכחי *</Label>
                <Input
                  id="index_current"
                  type="number"
                  step="0.01"
                  value={indexCurrentValue}
                  onChange={(e) => setIndexCurrentValue(e.target.value)}
                  placeholder="הזן ערך מדד נוכחי"
                />
              </div>

              {adjustmentFactor && (
                <div className="bg-background rounded p-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">מקדם הצמדה:</span>
                    <span className={adjustmentPercent >= 0 ? 'text-green-600' : 'text-destructive'}>
                      {adjustmentPercent >= 0 ? '+' : ''}{adjustmentPercent.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">סכום מקורי:</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>סכום מתואם:</span>
                    <span>{formatCurrency(adjustedAmount)}</span>
                  </div>
                </div>
              )}

              {!indexTerms!.index_base_value && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  <span>ערך מדד בסיס לא הוגדר בחוזה</span>
                </div>
              )}
            </div>
          )}

          {amount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{hasIndex && adjustmentFactor ? 'סכום מתואם לפני מע״מ:' : 'סכום לפני מע״מ:'}</span>
                <span>{formatCurrency(adjustedAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>מע״מ ({vatPercent}%):</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>סה״כ לתשלום:</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="הערות לבקשה..."
              rows={2}
            />
          </div>

          {incompleteTasksWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{incompleteTasksWarning}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={loading || !formData.amount}>
              {loading ? 'יוצר...' : 'צור בקשה'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
