import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Milestone, Plus } from 'lucide-react';
import { PaymentMilestone } from '@/types/payment';
import { PaymentMilestoneCard } from './PaymentMilestoneCard';

interface PaymentMilestoneListProps {
  milestones: PaymentMilestone[];
  onCreateMilestone: () => void;
  onRequestPayment: (milestone: PaymentMilestone) => void;
}

export function PaymentMilestoneList({ 
  milestones, 
  onCreateMilestone, 
  onRequestPayment 
}: PaymentMilestoneListProps) {
  // Group milestones by advisor
  const groupedMilestones = milestones.reduce((acc, milestone) => {
    const advisorName = milestone.project_advisor?.advisors?.company_name || 'ללא יועץ';
    if (!acc[advisorName]) {
      acc[advisorName] = [];
    }
    acc[advisorName].push(milestone);
    return acc;
  }, {} as Record<string, PaymentMilestone[]>);

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Milestone className="w-5 h-5" />
            אבני דרך לתשלום
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onCreateMilestone}>
            <Plus className="w-4 h-4 ml-1" />
            אבן דרך חדשה
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {milestones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Milestone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>לא הוגדרו אבני דרך לתשלום</p>
            <p className="text-sm">צרו אבני דרך לניהול לוח תשלומים מסודר</p>
          </div>
        ) : (
          Object.entries(groupedMilestones).map(([advisorName, advisorMilestones]) => (
            <div key={advisorName} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                💼 {advisorName}
              </h4>
              <div className="space-y-2 pr-4 border-r-2 border-muted">
                {advisorMilestones.map((milestone) => (
                  <PaymentMilestoneCard 
                    key={milestone.id} 
                    milestone={milestone}
                    onRequestPayment={onRequestPayment}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
