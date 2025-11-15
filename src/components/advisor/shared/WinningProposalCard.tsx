import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Coins, FileCheck } from 'lucide-react';
import { AdvisorProposal } from '@/hooks/advisor/useAdvisorProposals';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface WinningProposalCardProps {
  proposal: AdvisorProposal;
  onViewProject: (projectId: string) => void;
}

export const WinningProposalCard = ({ proposal, onViewProject }: WinningProposalCardProps) => {
  const approvalDetails = proposal.project_advisors?.[0];

  if (!approvalDetails) return null;

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 hover:shadow-elevated transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-amber-600" />
              {proposal.projects.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {proposal.projects.type}
            </p>
          </div>
          <Badge className="bg-amber-500 text-white hover:bg-amber-600">
            ✓ הצעה זוכה
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contract Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">שכר טרחה</p>
              <p className="font-semibold text-foreground">
                {approvalDetails.fee_currency || 'ILS'} {approvalDetails.fee_amount?.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-muted-foreground text-xs">תאריך אישור</p>
              <p className="font-semibold text-foreground">
                {format(new Date(approvalDetails.selected_at), 'dd/MM/yyyy', { locale: he })}
              </p>
            </div>
          </div>

          {approvalDetails.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">תאריך התחלה</p>
                <p className="font-semibold text-foreground">
                  {format(new Date(approvalDetails.start_date), 'dd/MM/yyyy', { locale: he })}
                </p>
              </div>
            </div>
          )}

          {approvalDetails.end_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">תאריך סיום</p>
                <p className="font-semibold text-foreground">
                  {format(new Date(approvalDetails.end_date), 'dd/MM/yyyy', { locale: he })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 sm:col-span-2">
            <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-foreground">{proposal.projects.location}</span>
          </div>
        </div>

        {/* Payment Terms */}
        {approvalDetails.payment_terms && (
          <div className="p-3 bg-white/80 rounded-lg border border-amber-200">
            <p className="text-xs text-muted-foreground mb-1">תנאי תשלום</p>
            <p className="text-sm text-foreground">{approvalDetails.payment_terms}</p>
          </div>
        )}

        {/* Scope of Work */}
        {approvalDetails.scope_of_work && (
          <div className="p-3 bg-white/80 rounded-lg border border-amber-200">
            <p className="text-xs text-muted-foreground mb-1">היקף עבודה</p>
            <p className="text-sm text-foreground line-clamp-2">{approvalDetails.scope_of_work}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewProject(proposal.project_id)}
            className="flex-1 border-amber-300 hover:bg-amber-50"
          >
            צפה בפרויקט
          </Button>
          {approvalDetails.agreement_url && (
            <Button
              size="sm"
              onClick={() => window.open(approvalDetails.agreement_url, '_blank')}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              צפה בהסכם
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
