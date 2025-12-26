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

interface ProjectAdvisor {
  id: string;
  advisor_id: string;
  fee_amount: number;
  advisors: {
    id: string;
    company_name: string | null;
  };
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
  const [formData, setFormData] = useState({
    amount: '',
    vat_percent: '17',
    project_advisor_id: '',
    payment_milestone_id: '',
    category: 'consultant',
    notes: '',
    external_party_name: '',
  });

  const vatPercent = parseFloat(formData.vat_percent) || 0;
  const amount = parseFloat(formData.amount) || 0;
  const vatAmount = amount * (vatPercent / 100);
  const totalAmount = amount + vatAmount;

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
      
      // Pre-fill from milestone if provided
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
    setLoading(true);
    
    try {
      await onSubmit({
        amount: parseFloat(formData.amount),
        vat_percent: parseFloat(formData.vat_percent),
        project_advisor_id: formData.project_advisor_id || null,
        payment_milestone_id: formData.payment_milestone_id || null,
        category: formData.category as 'consultant' | 'external' | 'other',
        notes: formData.notes || null,
        external_party_name: formData.category === 'external' ? formData.external_party_name : null,
      });
      
      setFormData({
        amount: '',
        vat_percent: '17',
        project_advisor_id: '',
        payment_milestone_id: '',
        category: 'consultant',
        notes: '',
        external_party_name: '',
      });
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

          {amount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>סכום לפני מע״מ:</span>
                <span>{formatCurrency(amount)}</span>
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
