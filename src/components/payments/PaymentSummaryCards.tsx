import { Card, CardContent } from '@/components/ui/card';
import { Wallet, CheckCircle, Clock, PiggyBank } from 'lucide-react';
import { PaymentSummary } from '@/types/payment';

interface PaymentSummaryCardsProps {
  summary: PaymentSummary;
}

export function PaymentSummaryCards({ summary }: PaymentSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const cards = [
    {
      title: 'תקציב יועצים',
      value: summary.totalBudget,
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'שולם',
      value: summary.totalPaid,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'ממתין לאישור',
      value: summary.totalPending,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      title: 'נותר',
      value: summary.totalRemaining,
      icon: PiggyBank,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  const paidPercentage = summary.totalBudget > 0 
    ? Math.round((summary.totalPaid / summary.totalBudget) * 100) 
    : 0;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Card key={card.title} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  <p className={`text-lg font-bold ${card.color}`}>
                    {formatCurrency(card.value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Bar */}
      {summary.totalBudget > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">התקדמות תשלומים</span>
            <span className="font-medium">{paidPercentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${paidPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
