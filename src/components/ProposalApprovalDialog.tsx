import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SignatureCanvas, SignatureData } from '@/components/SignatureCanvas';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, FileSignature, FileText, AlertCircle } from 'lucide-react';

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
    scope_text?: string;
    conditions_json?: {
      payment_terms?: string;
      assumptions?: string;
      exclusions?: string;
      validity_days?: number;
    };
    files?: any[];
    signature_blob?: string;
    submitted_at: string;
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
  const [authorizationAccepted, setAuthorizationAccepted] = useState(false);
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

    // Validate authorization checkbox
    if (!authorizationAccepted) {
      toast({
        title: 'נדרש אישור הרשאה',
        description: 'יש לאשר כי הנך מוסמך/ת לפעול בשם היזם/החברה',
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
      notes: notes.trim() || undefined,
    });

    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
      setNotes('');
      setSignature(null);
      setAuthorizationAccepted(false);
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
            <div className="bg-muted/50 p-4 rounded-lg max-h-[400px] overflow-y-auto">
              <h4 className="font-semibold mb-4 text-lg">סקירת ההצעה</h4>
              
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                <div>
                  <span className="text-muted-foreground text-sm">ספק:</span>
                  <p className="font-medium">{proposal.supplier_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">מחיר:</span>
                  <p className="font-medium text-green-600 text-xl">{formatCurrency(proposal.price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">זמן ביצוע:</span>
                  <p className="font-medium">{proposal.timeline_days} ימים</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">תאריך הגשה:</span>
                  <p className="font-medium">{new Date(proposal.submitted_at).toLocaleDateString('he-IL')}</p>
                </div>
              </div>

              {/* Scope of Work */}
              {proposal.scope_text && (
                <div className="mb-4 pb-4 border-b">
                  <h5 className="font-semibold mb-2 text-sm text-muted-foreground">היקף העבודה</h5>
                  <p className="text-sm whitespace-pre-wrap">{proposal.scope_text}</p>
                </div>
              )}

              {/* Conditions */}
              {proposal.conditions_json && Object.keys(proposal.conditions_json).length > 0 && (
                <div className="mb-4 pb-4 border-b">
                  <h5 className="font-semibold mb-2 text-sm text-muted-foreground">תנאים</h5>
                  <div className="space-y-2 text-sm">
                    {proposal.conditions_json.payment_terms && (
                      <div>
                        <strong>תנאי תשלום:</strong>
                        <p className="text-muted-foreground">{proposal.conditions_json.payment_terms}</p>
                      </div>
                    )}
                    {proposal.conditions_json.assumptions && (
                      <div>
                        <strong>הנחות יסוד:</strong>
                        <p className="text-muted-foreground">{proposal.conditions_json.assumptions}</p>
                      </div>
                    )}
                    {proposal.conditions_json.exclusions && (
                      <div>
                        <strong>לא כולל:</strong>
                        <p className="text-muted-foreground">{proposal.conditions_json.exclusions}</p>
                      </div>
                    )}
                    {proposal.conditions_json.validity_days && (
                      <div>
                        <strong>תוקף ההצעה:</strong>
                        <p className="text-muted-foreground">{proposal.conditions_json.validity_days} ימים</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Files */}
              {proposal.files && proposal.files.length > 0 && (
                <div className="mb-4 pb-4 border-b">
                  <h5 className="font-semibold mb-2 text-sm text-muted-foreground">קבצים מצורפים</h5>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">{proposal.files.length} קבצים</span>
                  </div>
                </div>
              )}

              {/* Signature Status */}
              <div className="flex items-center gap-2">
                {proposal.signature_blob ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">ההצעה נחתמה דיגיטלית</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">ללא חתימה דיגיטלית</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות (אופציונלי)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הוסף הערות או דרישות נוספות (לא חובה)..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                ניתן להוסיף הערות או דרישות נוספות. שדה זה אינו חובה.
              </p>
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

            {/* Authorization Checkbox - MANDATORY */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="authorization"
                  checked={authorizationAccepted}
                  onCheckedChange={(checked) => setAuthorizationAccepted(checked as boolean)}
                  className="mt-1"
                />
                <label
                  htmlFor="authorization"
                  className="text-sm font-medium leading-relaxed cursor-pointer flex-1"
                >
                  אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היזם/החברה לאישור ההצעה ולהתקשרות מול היועץ
                  <span className="text-red-500 mr-1">*</span>
                </label>
              </div>
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
                disabled={!signature || !authorizationAccepted || loading}
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
