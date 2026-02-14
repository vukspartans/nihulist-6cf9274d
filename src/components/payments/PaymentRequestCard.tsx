import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Check, X, Wallet, Eye, Trash2, ArrowLeft } from 'lucide-react';
import { PaymentRequest } from '@/types/payment';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { ApprovalProgressStepper } from './ApprovalProgressStepper';
import { NextStep } from '@/hooks/useApprovalChain';
import { PaymentStatusDefinition } from '@/types/paymentStatus';

interface PaymentRequestCardProps {
  request: PaymentRequest;
  onApprove: (request: PaymentRequest) => void;
  onReject: (request: PaymentRequest) => void;
  onMarkPaid: (request: PaymentRequest) => void;
  onView: (request: PaymentRequest) => void;
  onDelete?: (request: PaymentRequest) => void;
  nextStep: NextStep | null;
  currentStepIndex: number;
  totalSteps: number;
  statuses: PaymentStatusDefinition[];
}

export function PaymentRequestCard({ 
  request, 
  onApprove, 
  onReject, 
  onMarkPaid,
  onView,
  onDelete,
  nextStep,
  currentStepIndex,
  totalSteps,
  statuses,
}: PaymentRequestCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('he-IL');
  };

  const advisorName = request.project_advisor?.advisors?.company_name 
    || request.external_party_name 
    || 'לא צוין';

  const isPrepared = request.status === 'prepared';
  const isAwaitingPayment = request.status === 'awaiting_payment';
  const isPaid = request.status === 'paid';
  const isRejected = request.status === 'rejected';
  const isTerminal = isPaid || isRejected;

  // Show advance button for non-terminal, non-prepared statuses that have a next step
  const showAdvanceButton = !isPrepared && !isTerminal && !isAwaitingPayment && nextStep;
  // Show mark paid for awaiting_payment
  const showMarkPaid = isAwaitingPayment;
  // Show reject for non-terminal, non-prepared
  const showReject = !isPrepared && !isTerminal;

  return (
    <Card className="hover:shadow-sm transition-shadow" dir="rtl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">
                {request.request_number || `#${request.id.slice(0, 8)}`}
              </span>
              <PaymentStatusBadge status={request.status} />
            </div>

            <ApprovalProgressStepper
              statuses={statuses}
              currentStepIndex={currentStepIndex}
            />
            
            <p className="font-medium truncate mt-1">{advisorName}</p>
            
            {request.payment_milestone?.name && (
              <p className="text-sm text-muted-foreground">
                אבן דרך: {request.payment_milestone.name}
              </p>
            )}

            {request.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {request.notes}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {request.submitted_at && (
                <span>הוגש: {formatDate(request.submitted_at)}</span>
              )}
              {request.invoice_file_url && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  חשבונית מצורפת
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-left">
              <p className="text-lg font-bold text-primary">
                {formatCurrency(request.total_amount || request.amount)}
              </p>
              {request.vat_amount && request.vat_amount > 0 && (
                <p className="text-xs text-muted-foreground">
                  כולל מע״מ: {formatCurrency(request.vat_amount)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onView(request)}
                className="h-8 w-8 p-0"
              >
                <Eye className="w-4 h-4" />
              </Button>

              {showAdvanceButton && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApprove(request)}
                  className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Check className="w-3 h-3 ml-1" />
                  {nextStep.name}
                </Button>
              )}

              {showReject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(request)}
                  className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                >
                  <X className="w-3 h-3 ml-1" />
                  דחה
                </Button>
              )}

              {showMarkPaid && (
                <Button
                  size="sm"
                  onClick={() => onMarkPaid(request)}
                  className="h-8 text-xs"
                >
                  <Wallet className="w-3 h-3 ml-1" />
                  סמן כשולם
                </Button>
              )}

              {isPrepared && onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(request)}
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
