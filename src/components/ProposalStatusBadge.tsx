import { Badge } from '@/components/ui/badge';
import { Check, Clock, X, ArrowLeft, RefreshCw, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProposalStatusBadgeProps {
  proposalStatus: string;
  submittedAt?: string;
  approvedAt?: string | null;
  className?: string;
}

export const ProposalStatusBadge = ({ 
  proposalStatus, 
  submittedAt, 
  approvedAt,
  className 
}: ProposalStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (proposalStatus) {
      case 'accepted':
        return {
          text: 'הצעה אושרה',
          icon: Check,
          className: 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600',
        };
      case 'submitted':
        return {
          text: 'הצעה הוגשה',
          icon: Check,
          className: 'bg-green-500 text-white border-green-600 hover:bg-green-600',
        };
      case 'under_review':
        return {
          text: 'בבדיקה',
          icon: Clock,
          className: 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600',
        };
      case 'rejected':
        return {
          text: 'נדחתה',
          icon: X,
          className: 'bg-red-500 text-white border-red-600 hover:bg-red-600',
        };
      case 'withdrawn':
        return {
          text: 'נמשכה',
          icon: ArrowLeft,
          className: 'bg-gray-500 text-white border-gray-600 hover:bg-gray-600',
        };
      case 'resubmitted':
        return {
          text: 'הצעה מעודכנת',
          icon: RefreshCw,
          className: 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600',
        };
      case 'negotiation_requested':
        return {
          text: 'במשא ומתן',
          icon: MessageCircle,
          className: 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600',
        };
      default:
        return {
          text: proposalStatus,
          icon: Clock,
          className: 'bg-muted text-muted-foreground',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge className={cn(config.className, 'flex items-center gap-1.5 px-3 py-1', className)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium">{config.text}</span>
    </Badge>
  );
};
