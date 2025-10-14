import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Advisor {
  id: string;
  company_name: string;
  user: {
    name: string;
  };
}

interface AddAdvisorDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddAdvisorDialog = ({ projectId, open, onOpenChange, onSuccess }: AddAdvisorDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeType, setFeeType] = useState('fixed');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAdvisors();
    }
  }, [open]);

  const fetchAdvisors = async () => {
    try {
      const { data: advisorsData, error } = await supabase
        .from('advisors')
        .select('id, company_name, user_id')
        .eq('is_active', true)
        .eq('admin_approved', true);

      if (error) throw error;

      // Fetch profiles for these advisors
      const userIds = advisorsData?.map(a => a.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);

      // Merge the data
      const enrichedAdvisors = advisorsData?.map(advisor => ({
        ...advisor,
        user: profiles?.find(p => p.user_id === advisor.user_id) || { name: '' }
      })) || [];

      setAdvisors(enrichedAdvisors as any);
    } catch (error) {
      console.error('Error fetching advisors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAdvisorId || !feeAmount) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא את כל השדות הנדרשים',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_advisors')
        .insert({
          project_id: projectId,
          advisor_id: selectedAdvisorId,
          fee_amount: parseFloat(feeAmount),
          fee_currency: 'ILS',
          fee_type: feeType,
          payment_terms: paymentTerms || null,
          scope_of_work: scopeOfWork || null,
          start_date: startDate || null,
          end_date: endDate || null,
        });

      if (error) throw error;

      toast({
        title: 'יועץ נוסף',
        description: 'היועץ נוסף בהצלחה לפרויקט',
      });

      // Reset form
      setSelectedAdvisorId('');
      setFeeAmount('');
      setFeeType('fixed');
      setPaymentTerms('');
      setScopeOfWork('');
      setStartDate('');
      setEndDate('');
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding advisor:', error);
      toast({
        title: 'שגיאה',
        description: error.message || 'לא ניתן להוסיף את היועץ',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הוספת יועץ לפרויקט</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="advisor">בחר יועץ *</Label>
            <Select value={selectedAdvisorId} onValueChange={setSelectedAdvisorId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר יועץ" />
              </SelectTrigger>
              <SelectContent>
                {advisors.map((advisor) => (
                  <SelectItem key={advisor.id} value={advisor.id}>
                    {advisor.company_name} - {advisor.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feeAmount">סכום שכר טרחה *</Label>
              <Input
                id="feeAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feeType">סוג שכר טרחה *</Label>
              <Select value={feeType} onValueChange={setFeeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">סכום קבוע</SelectItem>
                  <SelectItem value="percentage">אחוז מהתקציב</SelectItem>
                  <SelectItem value="hourly">תעריף שעתי</SelectItem>
                  <SelectItem value="milestone">לפי אבני דרך</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentTerms">תנאי תשלום</Label>
            <Textarea
              id="paymentTerms"
              placeholder="למשל: תשלום ב-3 תשלומים שווים, תשלום בתום כל שלב..."
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scopeOfWork">היקף עבודה</Label>
            <Textarea
              id="scopeOfWork"
              placeholder="תאר את היקף העבודה המצופה מהיועץ..."
              value={scopeOfWork}
              onChange={(e) => setScopeOfWork(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">תאריך התחלה</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">תאריך סיום</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              הוסף יועץ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
