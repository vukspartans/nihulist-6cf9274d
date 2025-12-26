import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, AlertCircle } from 'lucide-react';
import { PaymentRequest } from '@/types/payment';
import { SignatureCanvas, SignatureData } from '@/components/SignatureCanvas';

interface ApprovePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PaymentRequest | null;
  onApprove: (request: PaymentRequest, signature?: SignatureData) => Promise<void>;
}

export function ApprovePaymentDialog({ 
  open, 
  onOpenChange, 
  request,
  onApprove 
}: ApprovePaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<SignatureData | null>(null);

  if (!request) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const advisorName = request.project_advisor?.advisors?.company_name 
    || request.external_party_name 
    || 'לא צוין';

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(request, signature || undefined);
      setSignature(null);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            אישור בקשת תשלום
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Request Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">מספר בקשה:</span>
              <span className="font-mono">{request.request_number || `#${request.id.slice(0, 8)}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">מוטב:</span>
              <span className="font-medium">{advisorName}</span>
            </div>
            {request.payment_milestone?.name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">אבן דרך:</span>
                <span>{request.payment_milestone.name}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">סכום לפני מע״מ:</span>
              <span>{formatCurrency(request.amount)}</span>
            </div>
            {request.vat_amount && request.vat_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">מע״מ ({request.vat_percent}%):</span>
                <span>{formatCurrency(request.vat_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>סה״כ לתשלום:</span>
              <span className="text-primary">{formatCurrency(request.total_amount || request.amount)}</span>
            </div>
          </div>

          {request.notes && (
            <div className="space-y-1">
              <Label className="text-muted-foreground">הערות:</Label>
              <p className="text-sm bg-background p-2 rounded border">{request.notes}</p>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              לאחר האישור, בקשת התשלום תסומן כמאושרת ותהיה מוכנה לביצוע התשלום בפועל.
            </AlertDescription>
          </Alert>

          {/* Signature (Optional) */}
          <div className="space-y-2">
            <Label>חתימה (אופציונלי)</Label>
            <SignatureCanvas 
              onSign={setSignature}
              className="border-0 shadow-none p-0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'מאשר...' : 'אשר תשלום'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
