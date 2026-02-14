import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, AlertCircle } from 'lucide-react';
import { PaymentRequest } from '@/types/payment';
import { SignatureCanvas, SignatureData } from '@/components/SignatureCanvas';
import { SignatureType } from '@/types/paymentStatus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ApprovePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PaymentRequest | null;
  onApprove: (request: PaymentRequest, signatureId?: string) => Promise<void>;
  nextStepName: string;
  requiresSignature: boolean;
  signatureType: SignatureType;
}

export function ApprovePaymentDialog({ 
  open, 
  onOpenChange, 
  request,
  onApprove,
  nextStepName,
  requiresSignature,
  signatureType,
}: ApprovePaymentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [checkboxConfirmed, setCheckboxConfirmed] = useState(false);

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

  const canSubmit = !requiresSignature 
    || (signatureType === 'drawn' && signature) 
    || (signatureType === 'checkbox' && checkboxConfirmed)
    || signatureType === 'none';

  const handleApprove = async () => {
    setLoading(true);
    try {
      let signatureId: string | undefined;
      
      if (signature && user?.id && signatureType === 'drawn') {
        const contentHash = btoa(JSON.stringify({
          request_id: request.id,
          amount: request.amount,
          timestamp: new Date().toISOString()
        })).slice(0, 64);
        
        const { data: signatureData, error: signatureError } = await supabase
          .from('signatures')
          .insert({
            entity_type: 'payment_request',
            entity_id: request.id,
            sign_text: nextStepName,
            sign_png: signature.png,
            sign_vector_json: { paths: signature.vector },
            content_hash: contentHash,
            signer_user_id: user.id,
            signer_name_snapshot: user.email || 'Unknown',
            signer_email_snapshot: user.email || 'Unknown',
          })
          .select()
          .single();
        
        if (signatureError) {
          console.error('Error saving signature:', signatureError);
          toast({
            title: "שגיאה בשמירת החתימה",
            description: "החתימה לא נשמרה, אבל האישור יימשך",
            variant: "destructive",
          });
        } else {
          signatureId = signatureData.id;
        }
      }
      
      await onApprove(request, signatureId);
      setSignature(null);
      setCheckboxConfirmed(false);
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
            {nextStepName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
              לאחר האישור, הבקשה תועבר לשלב: {nextStepName}
            </AlertDescription>
          </Alert>

          {/* Conditional signature section */}
          {requiresSignature && signatureType === 'drawn' && (
            <div className="space-y-2">
              <Label>חתימה</Label>
              <SignatureCanvas 
                onSign={setSignature}
                className="border-0 shadow-none p-0"
              />
            </div>
          )}

          {requiresSignature && signatureType === 'checkbox' && (
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox
                id="approval-confirm"
                checked={checkboxConfirmed}
                onCheckedChange={(checked) => setCheckboxConfirmed(!!checked)}
              />
              <Label htmlFor="approval-confirm" className="text-sm cursor-pointer">
                אני מאשר/ת את בקשת התשלום ואת נכונות הפרטים
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={loading || !canSubmit}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'מאשר...' : 'אשר'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
