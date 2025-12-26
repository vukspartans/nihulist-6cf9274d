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
import { X } from 'lucide-react';
import { PaymentRequest } from '@/types/payment';

interface RejectPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PaymentRequest | null;
  onReject: (request: PaymentRequest, reason: string) => Promise<void>;
}

export function RejectPaymentDialog({ 
  open, 
  onOpenChange, 
  request,
  onReject 
}: RejectPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

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

  const handleReject = async () => {
    if (!reason.trim()) return;
    
    setLoading(true);
    try {
      await onReject(request, reason);
      setReason('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <X className="w-5 h-5" />
            דחיית בקשת תשלום
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Request Summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">מספר בקשה:</span>
              <span className="font-mono">{request.request_number || `#${request.id.slice(0, 8)}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">מוטב:</span>
              <span>{advisorName}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>סכום:</span>
              <span>{formatCurrency(request.total_amount || request.amount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">סיבת הדחייה *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="נא לציין את הסיבה לדחיית הבקשה..."
              rows={3}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button 
            onClick={handleReject} 
            disabled={loading || !reason.trim()}
            variant="destructive"
          >
            {loading ? 'דוחה...' : 'דחה בקשה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
