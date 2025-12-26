import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Calendar, User, Building, CreditCard } from 'lucide-react';
import { PaymentRequest } from '@/types/payment';
import { PaymentStatusBadge } from './PaymentStatusBadge';

interface PaymentRequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PaymentRequest | null;
}

export function PaymentRequestDetailDialog({ 
  open, 
  onOpenChange, 
  request,
}: PaymentRequestDetailDialogProps) {
  if (!request) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const advisorName = request.project_advisor?.advisors?.company_name 
    || request.external_party_name 
    || 'לא צוין';

  const categoryLabels: Record<string, string> = {
    consultant: 'יועץ',
    external: 'גורם חיצוני',
    other: 'אחר',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            פרטי בקשת תשלום
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Header Info */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg">
              {request.request_number || `#${request.id.slice(0, 8)}`}
            </span>
            <PaymentStatusBadge status={request.status} />
          </div>

          <Separator />

          {/* Main Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building className="w-3 h-3" />
                מוטב
              </p>
              <p className="font-medium">{advisorName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                קטגוריה
              </p>
              <Badge variant="outline">{categoryLabels[request.category] || request.category}</Badge>
            </div>
          </div>

          {request.payment_milestone?.name && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">אבן דרך</p>
              <p>{request.payment_milestone.name}</p>
            </div>
          )}

          <Separator />

          {/* Financial Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
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
              <span>סה״כ:</span>
              <span className="text-primary">{formatCurrency(request.total_amount || request.amount)}</span>
            </div>
          </div>

          {request.notes && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">הערות</p>
              <p className="text-sm bg-background p-2 rounded border">{request.notes}</p>
            </div>
          )}

          {request.rejection_reason && (
            <div className="space-y-1">
              <p className="text-sm text-destructive">סיבת דחייה</p>
              <p className="text-sm bg-destructive/10 p-2 rounded border border-destructive/20">
                {request.rejection_reason}
              </p>
            </div>
          )}

          <Separator />

          {/* Timeline */}
          <div className="space-y-2 text-sm">
            <p className="font-medium flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              ציר זמן
            </p>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>נוצר:</span>
                <span>{formatDate(request.created_at)}</span>
              </div>
              {request.submitted_at && (
                <div className="flex justify-between">
                  <span>הוגש:</span>
                  <span>{formatDate(request.submitted_at)}</span>
                </div>
              )}
              {request.approved_at && (
                <div className="flex justify-between text-green-600">
                  <span>אושר:</span>
                  <span>{formatDate(request.approved_at)}</span>
                </div>
              )}
              {request.rejected_at && (
                <div className="flex justify-between text-destructive">
                  <span>נדחה:</span>
                  <span>{formatDate(request.rejected_at)}</span>
                </div>
              )}
              {request.paid_at && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>שולם:</span>
                  <span>{formatDate(request.paid_at)}</span>
                </div>
              )}
            </div>
          </div>

          {request.invoice_file_url && (
            <div className="pt-2">
              <a 
                href={request.invoice_file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                צפה בחשבונית המצורפת
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
