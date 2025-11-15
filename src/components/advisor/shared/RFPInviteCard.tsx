import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Coins, FileText, XCircle } from 'lucide-react';
import { RFPInvite } from '@/hooks/advisor/useAdvisorRFPInvites';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface RFPInviteCardProps {
  invite: RFPInvite;
  onViewDetails: (inviteId: string, projectId: string) => void;
  onSubmitProposal: (inviteId: string, projectId: string) => void;
  onDecline: (inviteId: string) => void;
}

export const RFPInviteCard = ({
  invite,
  onViewDetails,
  onSubmitProposal,
  onDecline,
}: RFPInviteCardProps) => {
  const project = invite.rfps.projects;
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      sent: 'bg-primary text-primary-foreground',
      opened: 'bg-tech-purple text-white',
      in_progress: 'bg-amber-500 text-white',
      submitted: 'bg-tech-success text-white',
      declined: 'bg-destructive text-destructive-foreground',
      expired: 'bg-muted text-muted-foreground',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      sent: 'נשלח',
      opened: 'נפתח',
      in_progress: 'בעבודה',
      submitted: 'הוגשה הצעה',
      declined: 'נדחה',
      expired: 'פג תוקף',
    };
    return labels[status] || status;
  };

  const canSubmitProposal = (status: string) => {
    return ['sent', 'opened', 'in_progress'].includes(status);
  };

  return (
    <Card className="hover:shadow-card transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <CardDescription className="mt-1">{project.type}</CardDescription>
          </div>
          <Badge className={getStatusColor(invite.status)}>
            {getStatusLabel(invite.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Project Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4 shrink-0" />
            <span>₪{project.budget?.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {format(new Date(project.timeline_start), 'dd/MM/yyyy', { locale: he })}
            </span>
          </div>
          {invite.advisor_type && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{invite.advisor_type}</span>
            </div>
          )}
        </div>

        {/* Decline Info */}
        {invite.status === 'declined' && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">סיבת הדחייה:</p>
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {invite.decline_note || 'לא צוינה סיבה'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(invite.id, project.id)}
            className="flex-1"
          >
            צפה בפרטים
          </Button>
          {canSubmitProposal(invite.status) && (
            <>
              <Button
                size="sm"
                onClick={() => onSubmitProposal(invite.id, project.id)}
                className="flex-1"
              >
                הגש הצעת מחיר
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDecline(invite.id)}
              >
                דחה
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
