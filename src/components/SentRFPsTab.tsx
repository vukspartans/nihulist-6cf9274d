import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertCircle, Eye, CheckCircle2, Clock, XCircle, FileText, Send, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { useRFPInvitesWithDetails, AdvisorTypeGroup } from '@/hooks/useRFPInvitesWithDetails';
import { ProposalDetailDialog } from './ProposalDetailDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SentRFPsTabProps {
  projectId: string;
}

export const SentRFPsTab = ({ projectId }: SentRFPsTabProps) => {
  const { data: advisorTypeGroups, isLoading, error } = useRFPInvitesWithDetails(projectId);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingProposalId, setLoadingProposalId] = useState<string | null>(null);

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

  const handleViewProposal = async (proposalId: string) => {
    setLoadingProposalId(proposalId);
    try {
      const { data: proposalData, error: fetchError } = await supabase
        .from('proposals')
        .select(`
          *,
          advisors!proposals_advisor_id_fkey (
            id, company_name, logo_url, expertise, rating, 
            location, founding_year, office_size, website, linkedin_url
          ),
          rfp_invite:rfp_invite_id (
            advisor_type, request_title, deadline_at
          )
        `)
        .eq('id', proposalId)
        .single();
      
      if (fetchError) throw fetchError;
      
      setSelectedProposal(proposalData);
      setDetailDialogOpen(true);
    } catch (err) {
      console.error('Error fetching proposal:', err);
      toast.error('שגיאה בטעינת ההצעה');
    } finally {
      setLoadingProposalId(null);
    }
  };

  // Safe date formatting helper
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy', { locale: he });
    } catch {
      return '-';
    }
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

  if (!advisorTypeGroups || advisorTypeGroups.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">לא נשלחו בקשות עדיין</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total invites and proposals across all groups
  const totalInvites = advisorTypeGroups.reduce((sum, g) => sum + g.totalInvites, 0);
  const totalProposals = advisorTypeGroups.reduce((sum, g) => sum + g.proposalsCount, 0);

  return (
    <div className="space-y-4">
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            בקשות שנשלחו לפי סוג יועץ
            <Badge variant="secondary">{advisorTypeGroups.length} תחומים</Badge>
            <Badge variant="outline">{totalInvites} בקשות</Badge>
            {totalProposals > 0 && (
              <Badge variant="success">{totalProposals} הצעות</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {advisorTypeGroups.map((group: AdvisorTypeGroup) => (
              <AccordionItem key={group.advisorType} value={group.advisorType}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center flex-1 min-w-0 pr-4 gap-4">
                    <div className="flex items-center gap-2 justify-start min-w-0">
                      <Badge variant="outline" className="text-sm font-medium truncate max-w-[200px]">
                        {group.advisorType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 justify-end shrink-0 whitespace-nowrap">
                      <Badge variant="outline">
                        {group.totalInvites === 1 ? 'בקשה 1' : `${group.totalInvites} בקשות`}
                      </Badge>
                      {group.proposalsCount > 0 && (
                        <Badge variant="success">
                          {group.proposalsCount === 1 ? 'הצעה 1' : `${group.proposalsCount} הצעות`}
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {group.invites.length === 0 ? (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        לא נשלחו הזמנות ליועצים עבור תחום זה.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">שם יועץ</TableHead>
                          <TableHead className="text-right">תאריך שליחה</TableHead>
                          <TableHead className="text-right">סטטוס</TableHead>
                          <TableHead className="text-right">תאריך יעד</TableHead>
                          <TableHead className="text-right">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.invites.map((invite) => (
                          <TableRow key={invite.inviteId}>
                            <TableCell className="font-medium">{invite.advisorName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(invite.rfpSentAt)}
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
                              {formatDate(invite.deadlineAt)}
                            </TableCell>
                            <TableCell>
                              {invite.proposalId ? (
                                <div className="flex items-center gap-2">
                                  {invite.proposalStatus === 'resubmitted' && (
                                    <Badge 
                                      variant="default" 
                                      className="bg-green-100 text-green-800 border-green-300 gap-1"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      הצעה מעודכנת
                                    </Badge>
                                  )}
                                  {invite.proposalStatus === 'negotiation_requested' && (
                                    <Badge 
                                      variant="secondary" 
                                      className="bg-amber-100 text-amber-800 border-amber-300 gap-1"
                                    >
                                      <Clock className="h-3 w-3" />
                                      במו״מ
                                    </Badge>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewProposal(invite.proposalId!)}
                                    className="gap-2"
                                    disabled={loadingProposalId === invite.proposalId}
                                  >
                                    {loadingProposalId === invite.proposalId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                    צפה בהצעה
                                  </Button>
                                </div>
                              ) : invite.status === 'submitted' ? (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  הצעה חסרה
                                </Badge>
                              ) : null}
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
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {selectedProposal && (
        <ProposalDetailDialog
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) setSelectedProposal(null);
          }}
          proposal={selectedProposal}
          projectId={projectId}
        />
      )}
    </div>
  );
};
