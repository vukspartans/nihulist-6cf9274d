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
import { PaymentMilestone } from '@/types/payment';

interface ProjectAdvisor {
  id: string;
  advisor_id: string;
  fee_amount: number;
  advisors: {
    id: string;
    company_name: string | null;
  };
}

interface CreateMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSubmit: (milestone: Partial<PaymentMilestone>) => Promise<any>;
}

export function CreateMilestoneDialog({ 
  open, 
  onOpenChange, 
  projectId,
  onSubmit 
}: CreateMilestoneDialogProps) {
  const [loading, setLoading] = useState(false);
  const [projectAdvisors, setProjectAdvisors] = useState<ProjectAdvisor[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    project_advisor_id: '',
    due_date: '',
    description: '',
    trigger_type: 'manual',
  });

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
    }
  }, [projectId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit({
        name: formData.name,
        amount: parseFloat(formData.amount),
        project_advisor_id: formData.project_advisor_id || null,
        due_date: formData.due_date || null,
        description: formData.description || null,
        trigger_type: formData.trigger_type,
      });
      
      setFormData({
        name: '',
        amount: '',
        project_advisor_id: '',
        due_date: '',
        description: '',
        trigger_type: 'manual',
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>אבן דרך חדשה לתשלום</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם אבן הדרך *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="למשל: מקדמה, השלמת תכנון, סיום פרויקט"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">סכום (₪) *</Label>
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
            <Label htmlFor="advisor">יועץ</Label>
            <Select 
              value={formData.project_advisor_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, project_advisor_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר יועץ (אופציונלי)" />
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

          <div className="space-y-2">
            <Label htmlFor="due_date">תאריך יעד</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="תיאור אופציונלי..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.amount}>
              {loading ? 'יוצר...' : 'צור אבן דרך'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
