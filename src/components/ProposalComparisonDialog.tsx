import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Clock, Award, CheckCircle, XCircle, Sparkles, AlertCircle, CheckCircle2, Download, FileText, BarChart3, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { ProposalApprovalDialog } from './ProposalApprovalDialog';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { useProposalEvaluation } from '@/hooks/useProposalEvaluation';
import { ProposalComparisonCharts } from './ProposalComparisonCharts';
import { exportToExcel, exportToPDF } from '@/utils/exportProposals';
import { VersionBadge, RejectProposalDialog, NegotiationDialog, BulkNegotiationDialog } from './negotiation';
import { useNegotiation } from '@/hooks/useNegotiation';
import { useLineItems } from '@/hooks/useLineItems';

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
  current_version?: number;
  has_active_negotiation?: boolean;
  conditions_json?: any;
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
  const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(new Set());
  const { rejectProposal, loading: actionLoading } = useProposalApproval();
  const { evaluateProposals, loading: evaluationLoading } = useProposalEvaluation();
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [showCharts, setShowCharts] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState<number>(0);
  
  // Negotiation state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [proposalToReject, setProposalToReject] = useState<Proposal | null>(null);
  const [negotiationDialogOpen, setNegotiationDialogOpen] = useState(false);
  const [bulkNegotiationDialogOpen, setBulkNegotiationDialogOpen] = useState(false);
  const [proposalForNegotiation, setProposalForNegotiation] = useState<Proposal | null>(null);
  const { rejectProposal: rejectWithNotification, loading: rejectLoading } = useNegotiation();

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
        .select('*, evaluation_score, evaluation_rank, evaluation_result, evaluation_status, current_version, has_active_negotiation, conditions_json')
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

  const handleRejectClick = (proposal: Proposal) => {
    setProposalToReject(proposal);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason?: string) => {
    if (!proposalToReject) return;
    const success = await rejectWithNotification(proposalToReject.id, reason);
    if (success) {
      setRejectDialogOpen(false);
      setProposalToReject(null);
      fetchProposals();
    }
  };

  const handleNegotiationClick = (proposal: Proposal) => {
    setProposalForNegotiation(proposal);
    setNegotiationDialogOpen(true);
  };

  const handleBulkNegotiationClick = () => {
    setBulkNegotiationDialogOpen(true);
  };

  const toggleProposalSelection = (proposalId: string) => {
    setSelectedProposalIds(prev => {
      const next = new Set(prev);
      if (next.has(proposalId)) {
        next.delete(proposalId);
      } else {
        next.add(proposalId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const eligibleProposals = sortedProposals.filter(p => p.status === 'submitted' || p.status === 'resubmitted');
    if (selectedProposalIds.size === eligibleProposals.length) {
      setSelectedProposalIds(new Set());
    } else {
      setSelectedProposalIds(new Set(eligibleProposals.map(p => p.id)));
    }
  };

  const selectedProposals = proposals.filter(p => selectedProposalIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              השוואת הצעות מחיר - {advisorType}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <Button
                onClick={handleEvaluate}
                disabled={evaluationLoading || proposals.length < 2}
                className="flex items-center gap-2"
                dir="rtl"
              >
                <Sparkles className="w-4 h-4" />
                {evaluationLoading ? 'מעריך...' : 'הערך עם AI'}
              </Button>
              {proposals.some(p => p.evaluation_rank) && (
                <>
                  <Button
                    onClick={() => setShowCharts(!showCharts)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    dir="rtl"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {showCharts ? 'הסתר גרפים' : 'הצג גרפים'}
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    dir="rtl"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button
                    onClick={handleExportExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    dir="rtl"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </Button>
                </>
              )}
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

        {/* Bulk Actions Bar */}
        {selectedProposalIds.size > 0 && (
          <Alert className="mb-4 flex items-center justify-between">
            <AlertDescription className="flex items-center gap-2">
              <span>נבחרו {selectedProposalIds.size} הצעות</span>
            </AlertDescription>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkNegotiationClick}
                disabled={selectedProposalIds.size < 1}
              >
                <RefreshCw className="w-4 h-4 ms-1" />
                בקש הצעות מחודשות ({selectedProposalIds.size})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedProposalIds(new Set())}
              >
                נקה בחירה
              </Button>
            </div>
          </Alert>
        )}

        {/* Tabs for Table and Charts View */}
        <Tabs defaultValue="table" className="w-full">
          <div className="flex items-center justify-between mb-3 gap-4">
            <TabsList>
              <TabsTrigger value="table">טבלה</TabsTrigger>
              {proposals.some(p => p.evaluation_rank) && (
                <TabsTrigger value="charts">גרפים</TabsTrigger>
              )}
            </TabsList>
            <div className="flex items-center gap-2" dir="rtl">
              <span className="text-xs text-muted-foreground">מיין לפי:</span>
              <Button
                variant={sortBy === 'score' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('score')}
                disabled={!proposals.some(p => p.evaluation_rank)}
                dir="rtl"
                className="text-xs h-7 px-2"
              >
                <Award className="w-3 h-3 ml-1" />
                דירוג AI
              </Button>
              <Button
                variant={sortBy === 'price' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('price')}
                dir="rtl"
                className="text-xs h-7 px-2"
              >
                מחיר
              </Button>
              <Button
                variant={sortBy === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('timeline')}
                dir="rtl"
                className="text-xs h-7 px-2"
              >
                זמן ביצוע
              </Button>
            </div>
          </div>

          <TabsContent value="table" className="space-y-2" dir="rtl">

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
            <TooltipProvider>
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="text-center text-xs py-2 w-10">
                    <Checkbox
                      checked={selectedProposalIds.size > 0 && selectedProposalIds.size === sortedProposals.filter(p => p.status === 'submitted' || p.status === 'resubmitted').length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-right text-xs py-2">דירוג</TableHead>
                  <TableHead className="text-right text-xs py-2">ספק</TableHead>
                  <TableHead className="text-right text-xs py-2">ציון AI</TableHead>
                  <TableHead className="text-right text-xs py-2">מחיר</TableHead>
                  <TableHead className="text-right text-xs py-2">זמן ביצוע</TableHead>
                  <TableHead className="text-right text-xs py-2">סטטוס</TableHead>
                  <TableHead className="text-right text-xs py-2">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody dir="rtl">
                {sortedProposals.map((proposal) => {
                  const evalData = proposal.evaluation_result;
                  const isBest = proposal.evaluation_rank === 1;
                  const recommendationLevel = evalData?.recommendation_level;
                  const canSelect = proposal.status === 'submitted' || proposal.status === 'resubmitted';
                  
                  return (
                    <TableRow 
                      key={proposal.id}
                      className={`${isBest ? 'bg-green-50 dark:bg-green-950/20' : ''} ${selectedProposalIds.has(proposal.id) ? 'bg-primary/5' : ''} h-auto`}
                    >
                      <TableCell className="text-center py-2">
                        {canSelect && (
                          <Checkbox
                            checked={selectedProposalIds.has(proposal.id)}
                            onCheckedChange={() => toggleProposalSelection(proposal.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2" dir="rtl">
                        <div className="flex justify-end items-center gap-1.5">
                          {proposal.evaluation_rank ? (
                            <div className="flex items-center gap-1.5" dir="rtl">
                              <Badge 
                                variant={isBest ? 'default' : 'secondary'}
                                className={`${isBest ? 'bg-green-600' : ''} text-xs px-1.5 py-0.5`}
                              >
                                #{proposal.evaluation_rank}
                              </Badge>
                              {isBest && (
                                <Award className="w-3 h-3 text-green-600 ml-0.5" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-right py-2" dir="rtl">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-right">{proposal.supplier_name}</span>
                            {(proposal.current_version && proposal.current_version > 1) && (
                              <VersionBadge 
                                currentVersion={proposal.current_version} 
                                hasActiveNegotiation={proposal.has_active_negotiation}
                              />
                            )}
                          </div>
                          {recommendationLevel && (
                            <div className="text-xs text-muted-foreground mt-0.5 text-right" dir="rtl">
                              {recommendationLevel === 'Highly Recommended' && '⭐ מומלץ מאוד'}
                              {recommendationLevel === 'Recommended' && '✓ מומלץ'}
                              {recommendationLevel === 'Review Required' && '⚠ דורש בדיקה'}
                              {recommendationLevel === 'Not Recommended' && '✗ לא מומלץ'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2" dir="rtl">
                        {proposal.evaluation_score !== null && proposal.evaluation_score !== undefined && (
                          <div className="flex items-center gap-0.5 justify-end" dir="rtl">
                            <span className="text-xs text-muted-foreground">100</span>
                            <span className="text-xs text-muted-foreground">/</span>
                            <span className={`font-bold text-base ${
                              proposal.evaluation_score >= 80 ? 'text-green-600' :
                              proposal.evaluation_score >= 60 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {proposal.evaluation_score}
                            </span>
                          </div>
                        )}
                        {evalData?.flags?.knockout_triggered && (
                          <div className="mt-0.5 flex justify-end" dir="rtl">
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                              <AlertCircle className="w-2.5 h-2.5 ml-0.5" />
                              נפסל
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2" dir="rtl">
                        <div className="flex items-center gap-1.5 flex-wrap justify-end" dir="rtl">
                          <span className={`text-sm ${proposal.price === bestPrice ? 'text-green-600 font-bold' : 'font-medium'}`}>
                            {formatCurrency(proposal.price)}
                          </span>
                          {proposal.price === bestPrice && !proposal.evaluation_rank && (
                            <Badge variant="default" className="bg-green-600 text-xs px-1.5 py-0.5" dir="rtl">
                              <TrendingUp className="w-2.5 h-2.5 ml-0.5" />
                              הכי טוב
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2" dir="rtl">
                        <div className="flex items-center gap-1.5 flex-wrap justify-end" dir="rtl">
                          <span className={`text-sm ${proposal.timeline_days === bestTimeline ? 'text-purple-600 font-bold' : ''}`}>
                            {proposal.timeline_days} ימים
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2" dir="rtl">
                        <div className="flex justify-end items-center gap-1.5">
                          <Badge 
                            variant={
                              proposal.status === 'accepted' ? 'default' : 
                              proposal.status === 'rejected' ? 'destructive' : 
                              proposal.status === 'resubmitted' ? 'secondary' :
                              'secondary'
                            }
                            className="text-xs px-1.5 py-0.5"
                          >
                            {proposal.status === 'submitted' && 'ממתין'}
                            {proposal.status === 'resubmitted' && 'עודכן'}
                            {proposal.status === 'accepted' && 'אושר'}
                            {proposal.status === 'rejected' && 'נדחה'}
                            {proposal.status === 'negotiation_requested' && 'בהמתנה לעדכון'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2" dir="rtl">
                        {(proposal.status === 'submitted' || proposal.status === 'resubmitted') && (
                          <div className="flex gap-1 justify-end" dir="rtl">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleApprove(proposal)}
                                  disabled={actionLoading}
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>אשר הצעה</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleNegotiationClick(proposal)}
                                  disabled={actionLoading || proposal.has_active_negotiation}
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>בקש הצעה מחודשת</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRejectClick(proposal)}
                                  disabled={actionLoading || rejectLoading}
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>דחה הצעה</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </TooltipProvider>
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

      {proposalToReject && (
        <RejectProposalDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          supplierName={proposalToReject.supplier_name}
          onConfirm={handleRejectConfirm}
          loading={rejectLoading}
        />
      )}

      {proposalForNegotiation && (
        <NegotiationDialog
          open={negotiationDialogOpen}
          onOpenChange={setNegotiationDialogOpen}
          proposal={{
            id: proposalForNegotiation.id,
            price: proposalForNegotiation.price,
            supplier_name: proposalForNegotiation.supplier_name,
            project_id: proposalForNegotiation.project_id,
            current_version: proposalForNegotiation.current_version,
          }}
          onSuccess={() => {
            setNegotiationDialogOpen(false);
            setProposalForNegotiation(null);
            fetchProposals();
          }}
        />
      )}

      <BulkNegotiationDialog
        open={bulkNegotiationDialogOpen}
        onOpenChange={setBulkNegotiationDialogOpen}
        proposals={selectedProposals.map(p => ({
          id: p.id,
          price: p.price,
          supplier_name: p.supplier_name,
          project_id: p.project_id,
        }))}
        onSuccess={() => {
          setBulkNegotiationDialogOpen(false);
          setSelectedProposalIds(new Set());
          fetchProposals();
        }}
      />
    </Dialog>
  );
};