import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, ShieldCheck, Bell } from 'lucide-react';

interface AdvisorStatsCardsProps {
  stats: {
    totalActiveRFPs: number;
    newInvites: number;
    submittedProposals: number;
    unsubmittedInvites: number;
    winningProposals: number;
  };
}

export const AdvisorStatsCards = ({ stats }: AdvisorStatsCardsProps) => {
  const cards = [
    {
      title: 'הצעות זוכות',
      value: stats.winningProposals,
      icon: ShieldCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'הזמנות חדשות',
      value: stats.newInvites,
      icon: Bell,
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
    {
      title: 'הצעות בהמתנה',
      value: stats.submittedProposals,
      icon: Clock,
      color: 'text-tech-purple',
      bgColor: 'bg-tech-purple-light',
    },
    {
      title: 'RFP פעילים',
      value: stats.unsubmittedInvites,
      icon: FileText,
      color: 'text-tech-success',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="hover:shadow-card transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
