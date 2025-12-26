import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle, Ban, FileCheck, Wallet } from 'lucide-react';
import { PaymentMilestoneStatus, PaymentRequestStatus } from '@/types/payment';

interface PaymentStatusBadgeProps {
  status: PaymentMilestoneStatus | PaymentRequestStatus;
  type?: 'milestone' | 'request';
}

const milestoneStatusConfig: Record<PaymentMilestoneStatus, { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'accent';
  icon: React.ReactNode;
}> = {
  pending: { label: 'ממתין', variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
  due: { label: 'לתשלום', variant: 'accent', icon: <AlertCircle className="w-3 h-3" /> },
  paid: { label: 'שולם', variant: 'success', icon: <Check className="w-3 h-3" /> },
  overdue: { label: 'באיחור', variant: 'destructive', icon: <AlertCircle className="w-3 h-3" /> },
};

const requestStatusConfig: Record<PaymentRequestStatus, { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'accent';
  icon: React.ReactNode;
}> = {
  prepared: { label: 'טיוטה', variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
  submitted: { label: 'הוגש', variant: 'default', icon: <FileCheck className="w-3 h-3" /> },
  approved: { label: 'מאושר', variant: 'success', icon: <Check className="w-3 h-3" /> },
  paid: { label: 'שולם', variant: 'success', icon: <Wallet className="w-3 h-3" /> },
  rejected: { label: 'נדחה', variant: 'destructive', icon: <Ban className="w-3 h-3" /> },
};

export function PaymentStatusBadge({ status, type = 'request' }: PaymentStatusBadgeProps) {
  const config = type === 'milestone' 
    ? milestoneStatusConfig[status as PaymentMilestoneStatus]
    : requestStatusConfig[status as PaymentRequestStatus];

  if (!config) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}
