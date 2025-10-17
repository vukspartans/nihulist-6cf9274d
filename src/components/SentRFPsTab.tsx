import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useProjectRFPs, RFPMetrics } from '@/hooks/useProjectRFPs';
import { ProposalComparisonDialog } from '@/components/ProposalComparisonDialog';
import { Clock, Send, FileText, AlertCircle } from 'lucide-react';

interface SentRFPsTabProps {
  projectId: string;
}

export const SentRFPsTab = ({ projectId }: SentRFPsTabProps) => {
  const { data: rfps, isLoading, error } = useProjectRFPs(projectId);
  const [comparisonDialog, setComparisonDialog] = useState<{
    open: boolean;
    proposalIds: string[];
    advisorType: string;
  }>({
    open: false,
    proposalIds: [],
    advisorType: '',
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'פתוח':
        return 'default';
      case 'ממתין':
        return 'secondary';
      case 'סגור':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusClassName = (status: string) => {
    switch (status) {
      case 'פתוח':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ממתין':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'סגור':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return '';
    }
  };

  const handleCompareProposals = (proposalIds: string[], advisorType: string) => {
    setComparisonDialog({
      open: true,
      proposalIds,
      advisorType,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">טוען בקשות להצעות מחיר...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground">שגיאה בטעינת הבקשות</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rfps || rfps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">לא נשלחו בקשות להצעות מחיר</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              כאשר תשלח בקשות להצעות מחיר, הן יופיעו כאן עם סטטוס ופירוט מלא.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            בקשות להצעות מחיר שנשלחו
            <Badge variant="secondary">{rfps.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {rfps.map((rfp, index) => (
              <AccordionItem key={rfp.rfpId} value={rfp.rfpId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(rfp.sentAt).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="font-medium">{rfp.subject}</span>
                    </div>
                    <Badge variant="outline" className="mr-2">
                      {rfp.advisorTypes.reduce((sum, type) => sum + type.invitesSent, 0)} הזמנות
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-4">
                    {rfp.advisorTypes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        לא נמצאו יועצים בבקשה זו
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">סוג יועץ</TableHead>
                            <TableHead className="text-right">הזמנות נשלחו</TableHead>
                            <TableHead className="text-right">הצעות התקבלו</TableHead>
                            <TableHead className="text-right">סטטוס</TableHead>
                            <TableHead className="text-right">פעולות</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rfp.advisorTypes.map((type) => (
                            <TableRow 
                              key={type.type}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                if (type.proposalIds.length > 0) {
                                  handleCompareProposals(type.proposalIds, type.type);
                                }
                              }}
                            >
                              <TableCell className="font-medium">{type.type}</TableCell>
                              <TableCell>{type.invitesSent}</TableCell>
                              <TableCell>
                                <span className={type.proposalsReceived > 0 ? 'font-semibold text-primary' : ''}>
                                  {type.proposalsReceived}/{type.invitesSent}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={getStatusVariant(type.status)}
                                  className={getStatusClassName(type.status)}
                                >
                                  {type.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {type.proposalIds.length > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompareProposals(type.proposalIds, type.type);
                                    }}
                                  >
                                    השווה הצעות ({type.proposalIds.length})
                                  </Button>
                                ) : (
                                  <span className="text-sm text-muted-foreground">אין הצעות</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <ProposalComparisonDialog
        open={comparisonDialog.open}
        onOpenChange={(open) => setComparisonDialog({ ...comparisonDialog, open })}
        proposalIds={comparisonDialog.proposalIds}
        advisorType={comparisonDialog.advisorType}
      />
    </>
  );
};
