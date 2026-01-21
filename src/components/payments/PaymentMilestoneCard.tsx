import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard } from 'lucide-react';
import { PaymentMilestone } from '@/types/payment';
import { PaymentStatusBadge } from './PaymentStatusBadge';

interface PaymentMilestoneCardProps {
  milestone: PaymentMilestone;
  onRequestPayment: (milestone: PaymentMilestone) => void;
}

export function PaymentMilestoneCard({ milestone, onRequestPayment }: PaymentMilestoneCardProps) {
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

  const canRequestPayment = milestone.status === 'pending' || milestone.status === 'due';

  return (
    <Card 
      dir="rtl"
      className={`border-r-4 ${
        milestone.status === 'paid' 
          ? 'border-r-green-500 bg-green-50/30 dark:bg-green-900/10' 
          : milestone.status === 'overdue'
          ? 'border-r-destructive'
          : milestone.status === 'due'
          ? 'border-r-amber-500'
          : 'border-r-muted'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{milestone.name}</h4>
              <PaymentStatusBadge status={milestone.status} type="milestone" />
            </div>
            
            {milestone.project_advisor?.advisors?.company_name && (
              <p className="text-sm text-muted-foreground mb-1">
                {milestone.project_advisor.advisors.company_name}
              </p>
            )}

            {milestone.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>תאריך יעד: {formatDate(milestone.due_date)}</span>
              </div>
            )}

            {milestone.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {milestone.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <p className="text-lg font-bold text-primary">
              {formatCurrency(milestone.amount)}
            </p>
            {milestone.percentage_of_total && (
              <span className="text-xs text-muted-foreground">
                {milestone.percentage_of_total}%
              </span>
            )}
            {canRequestPayment && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRequestPayment(milestone)}
                className="text-xs"
              >
                <CreditCard className="w-3 h-3 ml-1" />
                בקש תשלום
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
