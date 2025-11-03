import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SignatureCanvas, SignatureData } from '@/components/SignatureCanvas';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, FileSignature } from 'lucide-react';

interface ProposalApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    id: string;
    project_id: string;
    advisor_id: string;
    supplier_name: string;
    price: number;
    timeline_days: number;
  };
  onSuccess?: () => void;
}

export const ProposalApprovalDialog = ({
  open,
  onOpenChange,
  proposal,
  onSuccess,
}: ProposalApprovalDialogProps) => {
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [step, setStep] = useState<'notes' | 'signature'>('notes');
  const { approveProposal, loading } = useProposalApproval();
  const { toast } = useToast();

  const handleApprove = async () => {
    // Validate signature is captured
    if (!signature) {
      toast({
        title: 'חתימה חסרה',
        description: 'יש לחתום על האישור לפני המשך',
        variant: 'destructive'
      });
      return;
    }

    // Validate notes are provided
    if (!notes.trim()) {
      toast({
        title: 'הערות חסרות',
        description: 'יש להוסיף הערות לפני אישור ההצעה',
        variant: 'destructive'
      });
      return;
    }

    const result = await approveProposal({
      proposalId: proposal.id,
      projectId: proposal.project_id,
      advisorId: proposal.advisor_id,
      price: proposal.price,
      timelineDays: proposal.timeline_days,
      signature,
      notes,
    });

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
      setNotes('');
      setSignature(null);
      setStep('notes');
    }
  };

  const handleNext = () => {
    if (step === 'notes') {
      setStep('signature');
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
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            אישור הצעת מחיר
          </DialogTitle>
          <DialogDescription>
            אישור הצעה של {proposal.supplier_name}
          </DialogDescription>
        </DialogHeader>

        {step === 'notes' && (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">פרטי ההצעה</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">ספק:</span>
                  <p className="font-medium">{proposal.supplier_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">מחיר:</span>
                  <p className="font-medium text-green-600">{formatCurrency(proposal.price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">זמן ביצוע:</span>
                  <p className="font-medium">{proposal.timeline_days} ימים</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות (אופציונלי)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הוסף הערות או דרישות נוספות..."
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
              <Button onClick={handleNext}>
                <FileSignature className="w-4 h-4 ml-2" />
                המשך לחתימה
              </Button>
            </div>
          </div>
        )}

        {step === 'signature' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>חשוב:</strong> חתימתך מאשרת את תנאי ההצעה ומחייבת אותך כלפי היועץ.
              </p>
            </div>

            <SignatureCanvas
              onSign={setSignature}
              required
            />

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setStep('notes')}>
                חזור
              </Button>
              <Button 
                onClick={handleApprove} 
                disabled={!signature || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'מאשר...' : 'אשר הצעה'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
