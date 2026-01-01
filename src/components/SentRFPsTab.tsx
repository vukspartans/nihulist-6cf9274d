import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertCircle, Eye, CheckCircle2, Clock, XCircle, FileText, Send, Calendar } from 'lucide-react';
import { useRFPInvitesWithDetails } from '@/hooks/useRFPInvitesWithDetails';
import { ProposalComparisonDialog } from './ProposalComparisonDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface SentRFPsTabProps {
  projectId: string;
}

export const SentRFPsTab = ({ projectId }: SentRFPsTabProps) => {
  const { data: rfpsWithInvites, isLoading, error } = useRFPInvitesWithDetails(projectId);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [selectedAdvisorType, setSelectedAdvisorType] = useState<string>('');

  // Helper function to translate status to Hebrew
  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'ממתין',
      'sent': 'נשלח',
      'opened': 'נפתח',
      'in_progress': 'בתהליך',
      'submitted': 'הצעה התקבלה',
      'declined': 'סורב',
      'expired': 'פג תוקף',
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'success';
      case 'in_progress':
      case 'opened':
        return 'secondary';
      case 'declined':
      case 'expired':
        return 'destructive';
      case 'sent':
      case 'pending':
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress':
      case 'opened':
        return <Clock className="h-4 w-4" />;
      case 'declined':
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      case 'sent':
      case 'pending':
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleCompareProposals = (proposalIds: string[], advisorType: string) => {
    setSelectedProposalIds(proposalIds);
    setSelectedAdvisorType(advisorType);
    setComparisonDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">טוען בקשות...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-destructive">שגיאה בטעינת הבקשות</p>
        </CardContent>
      </Card>
    );
  }

  if (!rfpsWithInvites || rfpsWithInvites.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">לא נשלחו בקשות עדיין</p>
        </CardContent>
      </Card>
    );
  }

  // Check if any RFP has zero invites
  const hasZeroInvites = rfpsWithInvites.some(rfp => rfp.totalInvites === 0);

  return (
    <div className="space-y-4">
      {/* PHASE 5: Warning banner for RFPs with zero invites */}
      {hasZeroInvites && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>אזהרה:</strong> חלק מהבקשות לא נשלחו ליועצים. ייתכן שהיועצים שנבחרו אינם פעילים או לא אושרו על ידי המנהל.
          </AlertDescription>
        </Alert>
      )}

      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            בקשות שנשלחו
            <Badge variant="secondary">{rfpsWithInvites.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {rfpsWithInvites.map((rfp) => {
              const proposalsCount = rfp.advisorInvites.filter(inv => inv.proposalId).length;
              
              return (
                <AccordionItem key={rfp.rfpId} value={rfp.rfpId}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex flex-col items-start text-right gap-1">
                        {/* Show unique advisor types as badges instead of generic title */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {[...new Set(rfp.advisorInvites.map(inv => inv.advisorType).filter(Boolean))].map((type, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>נשלח: {format(new Date(rfp.sentAt), 'dd/MM/yyyy', { locale: he })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{rfp.totalInvites} בקשות</Badge>
                        {proposalsCount > 0 && (
                          <Badge variant="success">{proposalsCount} הצעות</Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {rfp.totalInvites === 0 ? (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          לא נשלחו הזמנות ליועצים עבור בקשה זו. ייתכן שהיועצים שנבחרו אינם פעילים או לא אושרו על ידי המנהל.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">שם יועץ</TableHead>
                            <TableHead className="text-right">תחום</TableHead>
                            <TableHead className="text-right">תאריך שליחה</TableHead>
                            <TableHead className="text-right">סטטוס</TableHead>
                            <TableHead className="text-right">תאריך יעד</TableHead>
                            <TableHead className="text-right">פעולות</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rfp.advisorInvites.map((invite) => (
                            <TableRow key={invite.inviteId}>
                              <TableCell className="font-medium">{invite.advisorName}</TableCell>
                              <TableCell>{invite.advisorType}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Send className="h-3.5 w-3.5" />
                                  {format(new Date(invite.createdAt), 'dd/MM/yyyy', { locale: he })}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={getStatusVariant(invite.status)}
                                  className={`gap-1 ${
                                    invite.status === 'submitted' ? 'bg-green-100 text-green-800 border-green-300' :
                                    invite.status === 'declined' || invite.status === 'expired' ? 'bg-red-100 text-red-800 border-red-300' :
                                    invite.status === 'opened' || invite.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    ''
                                  }`}
                                >
                                  {getStatusIcon(invite.status)}
                                  {translateStatus(invite.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {invite.deadlineAt 
                                  ? format(new Date(invite.deadlineAt), 'dd/MM/yyyy', { locale: he })
                                  : '-'
                                }
                              </TableCell>
                              <TableCell>
                                {invite.proposalId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCompareProposals([invite.proposalId!], invite.advisorType)}
                                    className="gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    צפה בהצעה
                                  </Button>
                                )}
                                {invite.status === 'declined' && invite.declineReason && (
                                  <span className="text-xs text-muted-foreground block mt-1">
                                    סיבה: {invite.declineReason}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <ProposalComparisonDialog
        open={comparisonDialogOpen}
        onOpenChange={setComparisonDialogOpen}
        proposalIds={selectedProposalIds}
        advisorType={selectedAdvisorType}
        projectId={projectId}
      />
    </div>
  );
};
