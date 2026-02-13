import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { PaymentMilestone, PaymentRequest } from '@/types/payment';

interface CashFlowChartProps {
  milestones: PaymentMilestone[];
  paymentRequests: PaymentRequest[];
}

interface CashFlowDataPoint {
  month: string;
  projected: number;
  actual: number;
  cumProjected: number;
  cumActual: number;
}

export function CashFlowChart({ milestones, paymentRequests }: CashFlowChartProps) {
  const data = useMemo(() => {
    const monthMap = new Map<string, { projected: number; actual: number }>();

    // Add projected from milestones with due_date
    milestones.forEach(m => {
      if (!m.due_date) return;
      const key = m.due_date.substring(0, 7); // YYYY-MM
      const entry = monthMap.get(key) || { projected: 0, actual: 0 };
      entry.projected += m.amount;
      monthMap.set(key, entry);
    });

    // Add actual from paid payment requests
    paymentRequests
      .filter(r => r.status === 'paid' && r.paid_at)
      .forEach(r => {
        const key = (r.paid_at as string).substring(0, 7);
        const entry = monthMap.get(key) || { projected: 0, actual: 0 };
        entry.actual += r.total_amount || r.amount;
        monthMap.set(key, entry);
      });

    if (monthMap.size === 0) return [];

    // Sort by month and build cumulative
    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    let cumProjected = 0;
    let cumActual = 0;

    return sorted.map(([month, vals]) => {
      cumProjected += vals.projected;
      cumActual += vals.actual;
      return {
        month: formatMonth(month),
        projected: vals.projected,
        actual: vals.actual,
        cumProjected,
        cumActual,
      } as CashFlowDataPoint;
    });
  }, [milestones, paymentRequests]);

  if (data.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5" />
          תזרים מצטבר – צפי מול בפועל
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'cumProjected' ? 'צפי מצטבר' : 'בפועל מצטבר',
              ]}
              labelFormatter={(label) => `חודש: ${label}`}
            />
            <Legend
              formatter={(value) =>
                value === 'cumProjected' ? 'צפי מצטבר' : 'בפועל מצטבר'
              }
            />
            <Area
              type="monotone"
              dataKey="cumProjected"
              stackId="1"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.15)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cumActual"
              stackId="2"
              stroke="hsl(var(--chart-2))"
              fill="hsl(var(--chart-2) / 0.15)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function formatMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}
