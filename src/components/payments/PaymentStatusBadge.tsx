import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle, Ban, FileCheck, Wallet, Loader2 } from 'lucide-react';
import { PaymentMilestoneStatus, PaymentRequestStatus } from '@/types/payment';
import { usePaymentStatusDefinitions } from '@/hooks/usePaymentStatusDefinitions';
import { useMemo } from 'react';

interface PaymentStatusBadgeProps {
  status: string;
  type?: 'milestone' | 'request';
}

// Fallback configs for milestones (these are not in DB)
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

// Fallback configs for requests (used when DB statuses not available)
const requestStatusFallback: Record<PaymentRequestStatus, { 
  label: string; 
  color: string;
  icon: React.ReactNode;
}> = {
  prepared: { label: 'טיוטה', color: '#6B7280', icon: <Clock className="w-3 h-3" /> },
  submitted: { label: 'הוגש', color: '#3B82F6', icon: <FileCheck className="w-3 h-3" /> },
  approved: { label: 'מאושר', color: '#10B981', icon: <Check className="w-3 h-3" /> },
  paid: { label: 'שולם', color: '#22C55E', icon: <Wallet className="w-3 h-3" /> },
  rejected: { label: 'נדחה', color: '#EF4444', icon: <Ban className="w-3 h-3" /> },
};

// Map status code to icon component
const getStatusIcon = (code: string): React.ReactNode => {
  switch (code) {
    case 'prepared':
      return <Clock className="w-3 h-3" />;
    case 'submitted':
      return <FileCheck className="w-3 h-3" />;
    case 'approved':
    case 'budget_approved':
      return <Check className="w-3 h-3" />;
    case 'paid':
      return <Wallet className="w-3 h-3" />;
    case 'rejected':
      return <Ban className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

export function PaymentStatusBadge({ status, type = 'request' }: PaymentStatusBadgeProps) {
  // For request type, try to use dynamic statuses from DB
  const { data: statusDefinitions, isLoading } = usePaymentStatusDefinitions(false);
  
  // Find dynamic status from DB
  const dynamicStatus = useMemo(() => {
    if (type !== 'request' || !statusDefinitions) return null;
    return statusDefinitions.find(s => s.code === status);
  }, [statusDefinitions, status, type]);

  // For milestones, use static config
  if (type === 'milestone') {
    const config = milestoneStatusConfig[status as PaymentMilestoneStatus];
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

  // For requests with loading state
  if (isLoading) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
      </Badge>
    );
  }

  // For requests, try dynamic status first
  if (dynamicStatus) {
    return (
      <Badge 
        className="flex items-center gap-1"
        style={{ 
          backgroundColor: `${dynamicStatus.color}20`,
          color: dynamicStatus.color,
          borderColor: dynamicStatus.color,
          borderWidth: '1px',
        }}
      >
        {getStatusIcon(dynamicStatus.code)}
        {dynamicStatus.name}
      </Badge>
    );
  }

  // Fallback to static config
  const fallbackConfig = requestStatusFallback[status as PaymentRequestStatus];
  if (!fallbackConfig) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <Badge 
      className="flex items-center gap-1"
      style={{ 
        backgroundColor: `${fallbackConfig.color}20`,
        color: fallbackConfig.color,
        borderColor: fallbackConfig.color,
        borderWidth: '1px',
      }}
    >
      {fallbackConfig.icon}
      {fallbackConfig.label}
    </Badge>
  );
}
