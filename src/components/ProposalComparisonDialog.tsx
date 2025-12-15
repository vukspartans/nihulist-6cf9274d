import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Clock, Award, CheckCircle, XCircle, Sparkles, AlertCircle, CheckCircle2, Download, FileText, BarChart3 } from 'lucide-react';
import { ProposalApprovalDialog } from './ProposalApprovalDialog';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { useProposalEvaluation } from '@/hooks/useProposalEvaluation';
import { ProposalComparisonCharts } from './ProposalComparisonCharts';
import { exportToExcel, exportToPDF } from '@/utils/exportProposals';

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
  evaluation_score?: number | null;
  evaluation_rank?: number | null;
  evaluation_result?: any;
  evaluation_status?: string;
}

interface ProposalComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalIds: string[];
  advisorType: string;
  projectId: string;
}

export const ProposalComparisonDialog = ({
  open,
  onOpenChange,
  proposalIds,
  advisorType,
  projectId,
}: ProposalComparisonDialogProps) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'timeline' | 'score'>('score');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const { rejectProposal, loading: actionLoading } = useProposalApproval();
  const { evaluateProposals, loading: evaluationLoading } = useProposalEvaluation();
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [showCharts, setShowCharts] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState<number>(0);

  useEffect(() => {
    if (open && proposalIds.length > 0) {
      fetchProposals();
      fetchProjectName();
    }
  }, [open, proposalIds, projectId]);

  const fetchProjectName = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      
      if (!error && data) {
        setProjectName(data.name || 'Project');
      }
    } catch (error) {
      console.error('Error fetching project name:', error);
    }
  };

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*, evaluation_score, evaluation_rank, evaluation_result, evaluation_status')
        .in('id', proposalIds);

      if (error) throw error;
      
      // Sort by evaluation rank if available, otherwise by price
      const sorted = (data || []).sort((a, b) => {
        if (a.evaluation_rank && b.evaluation_rank) {
          return a.evaluation_rank - b.evaluation_rank;
        }
        return a.price - b.price;
      });
      
      setProposals(sorted);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluationProgress(0);
    
    // Simulate progress (actual progress would come from streaming response in future)
    const progressInterval = setInterval(() => {
      setEvaluationProgress(prev => Math.min(prev + 10, 90));
    }, 500);
    
    try {
      const result = await evaluateProposals(projectId, proposalIds);
      clearInterval(progressInterval);
      setEvaluationProgress(100);
      
      if (result) {
        setEvaluationResult(result);
        await fetchProposals(); // Refresh to get updated evaluation data
        setShowCharts(true); // Auto-show charts after evaluation
      }
    } catch (error) {
      clearInterval(progressInterval);
      setEvaluationProgress(0);
    }
  };

  const handleExportExcel = () => {
    exportToExcel(proposals, projectName || 'Project');
  };

  const handleExportPDF = () => {
    exportToPDF(proposals, projectName || 'Project');
  };

  const sortedProposals = [...proposals].sort((a, b) => {
    if (sortBy === 'score' && a.evaluation_rank && b.evaluation_rank) {
      return a.evaluation_rank - b.evaluation_rank;
    }
    if (sortBy === 'price') {
      return a.price - b.price;
    }
    if (sortBy === 'timeline') {
      return a.timeline_days - b.timeline_days;
    }
    return 0;
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              השוואת הצעות מחיר - {advisorType}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {proposals.some(p => p.evaluation_rank) && (
                <>
                  <Button
                    onClick={handleExportExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button
                    onClick={() => setShowCharts(!showCharts)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {showCharts ? 'הסתר גרפים' : 'הצג גרפים'}
                  </Button>
                </>
              )}
              <Button
                onClick={handleEvaluate}
                disabled={evaluationLoading || proposals.length < 2}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {evaluationLoading ? 'מעריך...' : 'הערך עם AI'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Progressive Loading Indicator */}
        {evaluationLoading && evaluationProgress > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">מעריך הצעות...</span>
              <span className="text-muted-foreground">{evaluationProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${evaluationProgress}%` }}
              />
            </div>
          </div>
        )}

        {evaluationResult && (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              ההערכה הושלמה. נמצאו {evaluationResult.ranked_proposals.length} הצעות מדורגות.
              {evaluationResult.batch_summary.project_type_detected === 'LARGE_SCALE' && (
                <span className="block mt-1 text-sm font-semibold">
                  פרויקט בקנה מידה גדול - משקל ניסיון מוגבר
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Charts Section */}
        {showCharts && proposals.some(p => p.evaluation_rank) && (
          <ProposalComparisonCharts proposals={proposals} />
        )}

        {/* Tabs for Table and Charts View */}
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="table">טבלה</TabsTrigger>
            {proposals.some(p => p.evaluation_rank) && (
              <TabsTrigger value="charts">גרפים</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">מיין לפי:</span>
          <Button
            variant={sortBy === 'score' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('score')}
            disabled={!proposals.some(p => p.evaluation_rank)}
          >
            <Award className="w-3 h-3 ml-1" />
            דירוג AI
          </Button>
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
                  <TableHead className="text-right">דירוג</TableHead>
                  <TableHead className="text-right">ספק</TableHead>
                  <TableHead className="text-right">ציון AI</TableHead>
                  <TableHead className="text-right">מחיר</TableHead>
                  <TableHead className="text-right">זמן ביצוע</TableHead>
                  <TableHead className="text-right">תאריך הגשה</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProposals.map((proposal) => {
                  const evalData = proposal.evaluation_result;
                  const isBest = proposal.evaluation_rank === 1;
                  const recommendationLevel = evalData?.recommendation_level;
                  
                  return (
                    <TableRow 
                      key={proposal.id}
                      className={isBest ? 'bg-green-50 dark:bg-green-950/20' : ''}
                    >
                      <TableCell>
                        {proposal.evaluation_rank ? (
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={isBest ? 'default' : 'secondary'}
                              className={isBest ? 'bg-green-600' : ''}
                            >
                              #{proposal.evaluation_rank}
                            </Badge>
                            {isBest && (
                              <Award className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {proposal.supplier_name}
                        {recommendationLevel && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {recommendationLevel === 'Highly Recommended' && '⭐ מומלץ מאוד'}
                            {recommendationLevel === 'Recommended' && '✓ מומלץ'}
                            {recommendationLevel === 'Review Required' && '⚠ דורש בדיקה'}
                            {recommendationLevel === 'Not Recommended' && '✗ לא מומלץ'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {proposal.evaluation_score !== null && proposal.evaluation_score !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${
                              proposal.evaluation_score >= 80 ? 'text-green-600' :
                              proposal.evaluation_score >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {proposal.evaluation_score}
                            </span>
                            <span className="text-xs text-muted-foreground">/100</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">לא הוערך</span>
                        )}
                        {evalData?.flags?.knockout_triggered && (
                          <div className="mt-1">
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 ml-1" />
                              נפסל: {evalData.flags.knockout_reason || 'סיבה לא צוינה'}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={proposal.price === bestPrice ? 'text-green-600 font-bold' : ''}>
                            {formatCurrency(proposal.price)}
                          </span>
                          {proposal.price === bestPrice && !proposal.evaluation_rank && (
                            <Badge variant="default" className="bg-green-600">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              מחיר הכי טוב
                            </Badge>
                          )}
                        </div>
                        {evalData?.analysis?.price_assessment && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {evalData.analysis.price_assessment}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={proposal.timeline_days === bestTimeline ? 'text-blue-600 font-bold' : ''}>
                            {proposal.timeline_days}{' '}ימים
                          </span>
                          {proposal.timeline_days === bestTimeline && !proposal.evaluation_rank && (
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
          </TabsContent>

          <TabsContent value="charts">
            {proposals.some(p => p.evaluation_rank) ? (
              <ProposalComparisonCharts proposals={proposals} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">ביצע הערכה AI כדי לראות גרפים</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
