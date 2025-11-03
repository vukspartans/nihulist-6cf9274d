import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Clock, Award, CheckCircle, XCircle } from 'lucide-react';
import { ProposalApprovalDialog } from './ProposalApprovalDialog';
import { useProposalApproval } from '@/hooks/useProposalApproval';

interface Proposal {
  id: string;
  project_id: string;
  advisor_id: string;
  supplier_name: string;
  price: number;
  timeline_days: number;
  terms: string | null;
  submitted_at: string;
  status: string;
}

interface ProposalComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalIds: string[];
  advisorType: string;
}

export const ProposalComparisonDialog = ({
  open,
  onOpenChange,
  proposalIds,
  advisorType,
}: ProposalComparisonDialogProps) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'timeline'>('price');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const { rejectProposal, loading: actionLoading } = useProposalApproval();

  useEffect(() => {
    if (open && proposalIds.length > 0) {
      fetchProposals();
    }
  }, [open, proposalIds]);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .in('id', proposalIds)
        .order('price', { ascending: true });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedProposals = [...proposals].sort((a, b) => {
    if (sortBy === 'price') {
      return a.price - b.price;
    }
    return a.timeline_days - b.timeline_days;
  });

  const bestPrice = Math.min(...proposals.map(p => p.price));
  const bestTimeline = Math.min(...proposals.map(p => p.timeline_days));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleApprove = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setApprovalDialogOpen(true);
  };

  const handleReject = async (proposal: Proposal) => {
    if (!confirm(`האם אתה בטוח שברצונך לדחות את ההצעה של ${proposal.supplier_name}?`)) {
      return;
    }
    
    await rejectProposal(proposal.id, proposal.project_id);
    fetchProposals();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            השוואת הצעות מחיר - {advisorType}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">מיין לפי:</span>
          <Button
            variant={sortBy === 'price' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('price')}
          >
            מחיר
          </Button>
          <Button
            variant={sortBy === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('timeline')}
          >
            זמן ביצוע
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">טוען הצעות...</p>
          </div>
        ) : sortedProposals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">לא נמצאו הצעות מחיר</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">ספק</TableHead>
                  <TableHead className="text-right">מחיר</TableHead>
                  <TableHead className="text-right">זמן ביצוע</TableHead>
              <TableHead className="text-right">תאריך הגשה</TableHead>
              <TableHead className="text-right">קבצים</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProposals.map((proposal) => (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium">
                      {proposal.supplier_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={proposal.price === bestPrice ? 'text-green-600 font-bold' : ''}>
                          {formatCurrency(proposal.price)}
                        </span>
                        {proposal.price === bestPrice && (
                          <Badge variant="default" className="bg-green-600">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            מחיר הכי טוב
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={proposal.timeline_days === bestTimeline ? 'text-blue-600 font-bold' : ''}>
                          {proposal.timeline_days} ימים
                        </span>
                        {proposal.timeline_days === bestTimeline && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                            <Clock className="w-3 h-3 mr-1" />
                            הכי מהיר
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(proposal.submitted_at).toLocaleDateString('he-IL')}
                    </TableCell>
                    <TableCell className="text-right">
                      {(proposal as any).files && Array.isArray((proposal as any).files) && (proposal as any).files.length > 0 ? (
                        <div className="space-y-1">
                          {(proposal as any).files.map((file: any, idx: number) => (
                            <Button
                              key={idx}
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-primary"
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              📎 {file.name || `קובץ ${idx + 1}`}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">אין קבצים</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          proposal.status === 'accepted' ? 'default' : 
                          proposal.status === 'rejected' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {proposal.status === 'submitted' && 'ממתין'}
                        {proposal.status === 'accepted' && 'אושר'}
                        {proposal.status === 'rejected' && 'נדחה'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {proposal.status === 'submitted' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(proposal)}
                            disabled={actionLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-3 h-3 ml-1" />
                            אשר
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(proposal)}
                            disabled={actionLoading}
                          >
                            <XCircle className="w-3 h-3 ml-1" />
                            דחה
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>

      {selectedProposal && (
        <ProposalApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          proposal={selectedProposal}
          onSuccess={fetchProposals}
        />
      )}
    </Dialog>
  );
};
