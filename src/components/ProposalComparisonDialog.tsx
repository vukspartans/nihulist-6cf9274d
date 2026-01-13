import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Clock, Award, CheckCircle, XCircle, Sparkles, AlertCircle, CheckCircle2, Download, FileText, Trash2, RefreshCw, MessageSquare, HelpCircle, ChevronDown, ChevronUp, FileIcon, ExternalLink, Eye, EyeOff, Building2 } from 'lucide-react';
import { ProposalApprovalDialog } from './ProposalApprovalDialog';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { useProposalEvaluation } from '@/hooks/useProposalEvaluation';
import { exportToExcel, exportToPDF } from '@/utils/exportProposals';
import { VersionBadge, RejectProposalDialog, NegotiationDialog, BulkNegotiationDialog } from './negotiation';
import { useNegotiation } from '@/hooks/useNegotiation';
import { useLineItems } from '@/hooks/useLineItems';
import { WhyRecommendedPanel } from './WhyRecommendedPanel';

interface FeeLineItem {
  item_id?: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  is_optional?: boolean;
  comment?: string;
  is_entrepreneur_defined?: boolean;
}

interface MilestoneAdjustment {
  description: string;
  consultant_percentage: number;
  entrepreneur_percentage: number;
  is_entrepreneur_defined?: boolean;
}

interface ProposalFile {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

interface AdvisorProfile {
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface AdvisorInfo {
  company_name: string | null;
  location: string | null;
  rating: number | null;
  founding_year: number | null;
  office_size: string | null;
  user_id: string;
  logo_url?: string | null;
}

interface RFPInviteInfo {
  advisor_type: string | null;
  request_title: string | null;
}

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
  fee_line_items?: FeeLineItem[];
  selected_services?: string[];
  milestone_adjustments?: MilestoneAdjustment[];
  consultant_request_notes?: string;
  services_notes?: string;
  files?: ProposalFile[];
  scope_text?: string;
  advisor?: AdvisorInfo & { profile?: AdvisorProfile };
  rfp_invite?: RFPInviteInfo;
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
  const [sortBy, setSortBy] = useState<'price' | 'score'>('score');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(new Set());
  const { rejectProposal, loading: actionLoading } = useProposalApproval();
  const { evaluateProposals, loading: evaluationLoading } = useProposalEvaluation();
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [evaluationProgress, setEvaluationProgress] = useState<number>(0);
  const [selectedProposalForWhy, setSelectedProposalForWhy] = useState<Proposal | null>(null);
  const [whyRecommendedOpen, setWhyRecommendedOpen] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showOptionalItems, setShowOptionalItems] = useState(false);
  
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

  // Set default selected proposal when proposals are loaded and have evaluation
  useEffect(() => {
    if (proposals.length > 0 && !selectedProposalForWhy) {
      const topRanked = proposals.find(p => p.evaluation_rank === 1);
      if (topRanked) {
        setSelectedProposalForWhy(topRanked);
      } else {
        const withScore = proposals.find(p => p.evaluation_score != null);
        if (withScore) {
          setSelectedProposalForWhy(withScore);
        }
      }
    }
  }, [proposals]);

  const fetchProjectName = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .maybeSingle();
      
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
        .select(`
          id,
          project_id,
          advisor_id,
          supplier_name,
          price,
          timeline_days,
          terms,
          submitted_at,
          status,
          evaluation_score,
          evaluation_rank,
          evaluation_result,
          evaluation_status,
          current_version,
          has_active_negotiation,
          conditions_json,
          fee_line_items,
          selected_services,
          milestone_adjustments,
          consultant_request_notes,
          services_notes,
          files,
          scope_text,
          advisor:advisors!proposals_advisor_id_fkey (
            company_name,
            location,
            rating,
            founding_year,
            office_size,
            user_id,
            logo_url
          ),
          rfp_invite:rfp_invites!rfp_invite_id (
            advisor_type,
            request_title
          )
        `)
        .in('id', proposalIds);

      if (error) throw error;

      // Fetch profiles for advisors
      const advisorUserIds = (data || [])
        .map(p => (p.advisor as any)?.user_id)
        .filter(Boolean);
      
      let profilesMap: Record<string, AdvisorProfile> = {};
      if (advisorUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, phone, email')
          .in('user_id', advisorUserIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { name: p.name, phone: p.phone, email: p.email };
            return acc;
          }, {} as Record<string, AdvisorProfile>);
        }
      }
      
      // Map data to properly typed proposals
      const mappedData: Proposal[] = (data || []).map(p => {
        const advisorData = p.advisor as any;
        const profile = advisorData?.user_id ? profilesMap[advisorData.user_id] : undefined;
        
        return {
          id: p.id,
          project_id: p.project_id,
          advisor_id: p.advisor_id,
          supplier_name: p.supplier_name,
          price: p.price,
          timeline_days: p.timeline_days,
          terms: p.terms,
          submitted_at: p.submitted_at,
          status: p.status,
          evaluation_score: p.evaluation_score,
          evaluation_rank: p.evaluation_rank,
          evaluation_result: p.evaluation_result,
          evaluation_status: p.evaluation_status,
          current_version: p.current_version,
          has_active_negotiation: p.has_active_negotiation,
          conditions_json: p.conditions_json,
          fee_line_items: (p.fee_line_items as unknown as FeeLineItem[]) || [],
          selected_services: (p.selected_services as unknown as string[]) || [],
          milestone_adjustments: (p.milestone_adjustments as unknown as MilestoneAdjustment[]) || [],
          consultant_request_notes: p.consultant_request_notes,
          services_notes: p.services_notes,
          files: (p.files as unknown as ProposalFile[]) || [],
          scope_text: p.scope_text,
          advisor: advisorData ? { ...advisorData, profile } : undefined,
          rfp_invite: p.rfp_invite as RFPInviteInfo | undefined,
        };
      });

      // Sort by evaluation rank if available, otherwise by price
      const sorted = mappedData.sort((a, b) => {
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
    
    const progressInterval = setInterval(() => {
      setEvaluationProgress(prev => Math.min(prev + 10, 90));
    }, 500);
    
    try {
      const result = await evaluateProposals(projectId, proposalIds);
      clearInterval(progressInterval);
      setEvaluationProgress(100);
      
      if (result) {
        setEvaluationResult(result);
        await fetchProposals();
        setTimeout(() => {
          const topRanked = proposals.find(p => p.evaluation_rank === 1);
          if (topRanked) {
            setSelectedProposalForWhy(topRanked);
          } else {
            const withScore = proposals.find(p => p.evaluation_score != null);
            if (withScore) {
              setSelectedProposalForWhy(withScore);
            }
          }
        }, 500);
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

  // Calculate totals for a proposal
  const calculateTotals = (proposal: Proposal) => {
    const items = proposal.fee_line_items || [];
    const mandatory = items
      .filter(item => !item.is_optional)
      .reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 1)), 0);
    const optional = items
      .filter(item => item.is_optional)
      .reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 1)), 0);
    return { mandatory, optional, total: mandatory + optional };
  };

  const sortedProposals = [...proposals].sort((a, b) => {
    if (sortBy === 'score' && a.evaluation_rank && b.evaluation_rank) {
      return a.evaluation_rank - b.evaluation_rank;
    }
    if (sortBy === 'price') {
      return a.price - b.price;
    }
    return 0;
  });

  const bestPrice = proposals.length > 0 ? Math.min(...proposals.map(p => p.price)) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatUnit = (unit: string) => {
    const units: Record<string, string> = {
      'lump_sum': 'פאושל',
      'hour': 'שעה',
      'day': 'יום',
      'month': 'חודש',
      'sqm': 'מ"ר',
      'unit': 'יחידה',
      'visit': 'ביקור',
      'percent': '%',
    };
    return units[unit] || unit;
  };

  const toggleRowExpand = (proposalId: string) => {
    setExpandedRowId(prev => prev === proposalId ? null : proposalId);
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

  // Render expandable fee items section
  const renderFeeItemsSection = (proposal: Proposal) => {
    const items = proposal.fee_line_items || [];
    const mandatoryItems = items.filter(item => !item.is_optional);
    const optionalItems = items.filter(item => item.is_optional);
    const totals = calculateTotals(proposal);

    if (items.length === 0) {
      return (
        <div className="text-sm text-muted-foreground text-right py-2">
          לא הוזנו פריטי שכר טרחה מפורטים
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Mandatory Items */}
        {mandatoryItems.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 text-right">פריטים חובה</h4>
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="h-8 bg-muted/30">
                  <TableHead className="text-right text-xs py-1">תיאור</TableHead>
                  <TableHead className="text-right text-xs py-1 w-20">יחידה</TableHead>
                  <TableHead className="text-right text-xs py-1 w-16">כמות</TableHead>
                  <TableHead className="text-right text-xs py-1 w-24">מחיר יחידה</TableHead>
                  <TableHead className="text-right text-xs py-1 w-24">סה"כ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mandatoryItems.map((item, idx) => (
                  <TableRow key={idx} className="h-8">
                    <TableCell className="text-right text-xs py-1">
                      <div>
                        {item.description}
                        {item.comment && (
                          <div className="text-muted-foreground text-xs mt-0.5">{item.comment}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs py-1">{formatUnit(item.unit)}</TableCell>
                    <TableCell className="text-right text-xs py-1">{item.quantity}</TableCell>
                    <TableCell className="text-right text-xs py-1">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right text-xs py-1 font-medium">
                      {formatCurrency((item.unit_price || 0) * (item.quantity || 1))}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 h-8">
                  <TableCell colSpan={4} className="text-right text-xs py-1 font-medium">סה"כ חובה</TableCell>
                  <TableCell className="text-right text-xs py-1 font-bold">{formatCurrency(totals.mandatory)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Optional Items - Only show if toggle is enabled */}
        {showOptionalItems && optionalItems.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 text-right">פריטים אופציונליים</h4>
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="h-8 bg-muted/30">
                  <TableHead className="text-right text-xs py-1">תיאור</TableHead>
                  <TableHead className="text-right text-xs py-1 w-20">יחידה</TableHead>
                  <TableHead className="text-right text-xs py-1 w-16">כמות</TableHead>
                  <TableHead className="text-right text-xs py-1 w-24">מחיר יחידה</TableHead>
                  <TableHead className="text-right text-xs py-1 w-24">סה"כ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optionalItems.map((item, idx) => (
                  <TableRow key={idx} className="h-8">
                    <TableCell className="text-right text-xs py-1">
                      <div>
                        {item.description}
                        {item.comment && (
                          <div className="text-muted-foreground text-xs mt-0.5">{item.comment}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs py-1">{formatUnit(item.unit)}</TableCell>
                    <TableCell className="text-right text-xs py-1">{item.quantity}</TableCell>
                    <TableCell className="text-right text-xs py-1">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right text-xs py-1 font-medium">
                      {formatCurrency((item.unit_price || 0) * (item.quantity || 1))}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 h-8">
                  <TableCell colSpan={4} className="text-right text-xs py-1 font-medium">סה"כ אופציונלי</TableCell>
                  <TableCell className="text-right text-xs py-1 font-bold">{formatCurrency(totals.optional)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  // Render milestones section
  const renderMilestonesSection = (proposal: Proposal) => {
    const milestones = proposal.milestone_adjustments || [];
    const totals = calculateTotals(proposal);
    
    if (milestones.length === 0) {
      return (
        <div className="text-sm text-muted-foreground text-right py-2">
          לא הוגדרו אבני דרך לתשלום
        </div>
      );
    }

    return (
      <Table dir="rtl">
        <TableHeader>
          <TableRow className="h-8 bg-muted/30">
            <TableHead className="text-right text-xs py-1">אבן דרך</TableHead>
            <TableHead className="text-right text-xs py-1 w-24">אחוז</TableHead>
            <TableHead className="text-right text-xs py-1 w-28">סכום משוער</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {milestones.map((milestone, idx) => (
            <TableRow key={idx} className="h-8">
              <TableCell className="text-right text-xs py-1">{milestone.description}</TableCell>
              <TableCell className="text-right text-xs py-1">{milestone.consultant_percentage}%</TableCell>
              <TableCell className="text-right text-xs py-1">
                {formatCurrency((totals.mandatory * milestone.consultant_percentage) / 100)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Render files section
  const renderFilesSection = (proposal: Proposal) => {
    const files = proposal.files || [];
    
    if (files.length === 0) {
      return (
        <div className="text-sm text-muted-foreground text-right py-2">
          לא צורפו קבצים
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2 justify-end">
        {files.map((file, idx) => (
          <a
            key={idx}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-md text-xs transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{file.name}</span>
            <FileIcon className="w-3 h-3 text-muted-foreground" />
          </a>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden p-0 flex flex-col" dir="rtl">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <DialogTitle className="flex items-center gap-2 text-right">
              <Award className="w-5 h-5" />
              השוואת הצעות מחיר - {advisorType}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap flex-row-reverse">
              {proposals.some(p => p.evaluation_rank || p.evaluation_score) && (
                <>
                  <Button
                    onClick={() => {
                      const selected = selectedProposalForWhy || proposals.find(p => p.evaluation_rank === 1) || proposals.find(p => p.evaluation_score != null);
                      if (selected) {
                        setSelectedProposalForWhy(selected);
                        setWhyRecommendedOpen(true);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    למה מומלץ?
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleExportExcel}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    Excel
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    PDF
                    <FileText className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button
                onClick={handleEvaluate}
                disabled={evaluationLoading || proposals.length < 2}
                className="flex items-center gap-2"
              >
                {evaluationLoading ? 'מעריך...' : 'הערך עם AI'}
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-6">
          {/* Progressive Loading Indicator */}
          {evaluationLoading && evaluationProgress > 0 && (
            <div className="mb-4 mt-4" dir="rtl">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">מעריך הצעות...</span>
                <span className="text-muted-foreground">{evaluationProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden relative">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300 absolute right-0"
                  style={{ width: `${evaluationProgress}%` }}
                />
              </div>
            </div>
          )}

          {evaluationResult && (
            <Alert className="mb-4 mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-right">
                ההערכה הושלמה. נמצאו {evaluationResult.ranked_proposals.length} הצעות מדורגות.
              </AlertDescription>
            </Alert>
          )}

          {/* Bulk Actions Bar */}
          {selectedProposalIds.size > 0 && (
            <Alert className="mb-4 mt-4 flex items-center justify-between">
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
                  בקש הצעות מחודשות ({selectedProposalIds.size})
                  <RefreshCw className="w-4 h-4 me-1" />
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

          {/* Table Section */}
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-4 flex-wrap justify-between" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">מיין לפי:</span>
                <Button
                  variant={sortBy === 'score' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('score')}
                  disabled={!proposals.some(p => p.evaluation_rank)}
                  className="flex items-center gap-1.5"
                >
                  דירוג AI
                  <Award className="w-3 h-3" />
                </Button>
                <Button
                  variant={sortBy === 'price' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('price')}
                >
                  מחיר
                </Button>
              </div>
              
              {/* Show/Hide Optional Items Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptionalItems(!showOptionalItems)}
                className="flex items-center gap-1.5"
              >
                {showOptionalItems ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    הסתר אופציונליים
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    הצג אופציונליים
                  </>
                )}
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
              <div className="space-y-3">
                <TooltipProvider>
                  {sortedProposals.map((proposal) => {
                    const evalData = proposal.evaluation_result;
                    const isBest = proposal.evaluation_rank === 1;
                    const recommendationLevel = evalData?.recommendation_level;
                    const canSelect = proposal.status === 'submitted' || proposal.status === 'resubmitted';
                    const isExpanded = expandedRowId === proposal.id;
                    const totals = calculateTotals(proposal);
                    const hasFeeItems = (proposal.fee_line_items || []).length > 0;
                    
                    return (
                      <div 
                        key={proposal.id}
                        className={`border rounded-lg overflow-hidden ${isBest ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-border'} ${selectedProposalIds.has(proposal.id) ? 'ring-2 ring-primary/30' : ''}`}
                      >
                        {/* Main Row */}
                        <div 
                          className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleRowExpand(proposal.id)}
                        >
                          <div className="flex items-center gap-4 justify-between" dir="rtl">
                            {/* Right side - Selection & Info */}
                            <div className="flex items-center gap-4 flex-1">
                              {canSelect && (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedProposalIds.has(proposal.id)}
                                    onCheckedChange={() => toggleProposalSelection(proposal.id)}
                                  />
                                </div>
                              )}
                              
                              {/* Rank */}
                              <div className="flex items-center gap-1.5">
                                {proposal.evaluation_rank ? (
                                  <>
                                    <Badge 
                                      variant={isBest ? 'default' : 'secondary'}
                                      className={`${isBest ? 'bg-green-600' : ''} text-xs px-1.5 py-0.5`}
                                    >
                                      #{proposal.evaluation_rank}
                                    </Badge>
                                    {isBest && <Award className="w-4 h-4 text-green-600" />}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </div>

                              {/* Supplier/Company Info with Logo */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Advisor Logo */}
                                <div className="flex-shrink-0">
                                  {proposal.advisor?.logo_url ? (
                                    <img 
                                      src={proposal.advisor.logo_url} 
                                      alt={proposal.advisor.company_name || ''} 
                                      className="w-10 h-10 rounded-lg object-cover border"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border">
                                      <Building2 className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-base truncate">
                                      {proposal.advisor?.company_name || proposal.supplier_name || 'ללא שם'}
                                    </span>
                                    {(proposal.current_version && proposal.current_version > 1) && (
                                      <VersionBadge 
                                        currentVersion={proposal.current_version} 
                                        hasActiveNegotiation={proposal.has_active_negotiation}
                                      />
                                    )}
                                  </div>
                                  {proposal.advisor?.profile?.name && (
                                    <span className="text-sm text-muted-foreground">
                                      איש קשר: {proposal.advisor.profile.name}
                                    </span>
                                  )}
                                  {proposal.advisor?.location && (
                                    <span className="text-xs text-muted-foreground">
                                      📍 {proposal.advisor.location}
                                    </span>
                                  )}
                                  {recommendationLevel && (
                                    <span className="text-xs text-muted-foreground">
                                      {recommendationLevel === 'Highly Recommended' && '⭐ מומלץ מאוד'}
                                      {recommendationLevel === 'Recommended' && '✓ מומלץ'}
                                      {recommendationLevel === 'Review Required' && '⚠ דורש בדיקה'}
                                      {recommendationLevel === 'Not Recommended' && '✗ לא מומלץ'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* AI Score */}
                              {proposal.evaluation_score != null && (
                                <div className="flex items-center gap-1">
                                  <span className={`font-bold text-lg ${
                                    proposal.evaluation_score >= 80 ? 'text-green-600' :
                                    proposal.evaluation_score >= 60 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {proposal.evaluation_score}
                                  </span>
                                  <span className="text-xs text-muted-foreground">/100</span>
                                </div>
                              )}
                            </div>

                            {/* Center - Price Info */}
                            <div className="flex items-center gap-6">
                              {hasFeeItems ? (
                                <>
                                  <div className="text-center">
                                    <div className="text-xs text-muted-foreground">סה"כ חובה</div>
                                    <div className={`font-bold ${totals.mandatory === Math.min(...sortedProposals.map(p => calculateTotals(p).mandatory)) ? 'text-green-600' : ''}`}>
                                      {formatCurrency(totals.mandatory)}
                                    </div>
                                  </div>
                                  {showOptionalItems && totals.optional > 0 && (
                                    <div className="text-center">
                                      <div className="text-xs text-muted-foreground">אופציונלי</div>
                                      <div className="font-medium text-muted-foreground">
                                        {formatCurrency(totals.optional)}
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">מחיר</div>
                                  <div className={`font-bold ${proposal.price === bestPrice ? 'text-green-600' : ''}`}>
                                    {formatCurrency(proposal.price)}
                                  </div>
                                </div>
                              )}
                              

                              {/* Status */}
                              <Badge 
                                variant={
                                  proposal.status === 'accepted' ? 'default' : 
                                  proposal.status === 'rejected' ? 'destructive' : 
                                  proposal.status === 'resubmitted' ? 'secondary' :
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {proposal.status === 'submitted' && 'ממתין'}
                                {proposal.status === 'resubmitted' && 'עודכן'}
                                {proposal.status === 'accepted' && 'אושר'}
                                {proposal.status === 'rejected' && 'נדחה'}
                                {proposal.status === 'negotiation_requested' && 'משא ומתן'}
                              </Badge>
                            </div>

                            {/* Left side - Actions */}
                            <div className="flex items-center gap-2 flex-row-reverse">
                              {(proposal.status === 'submitted' || proposal.status === 'resubmitted') && (
                                <div className="flex gap-1 flex-row-reverse" onClick={(e) => e.stopPropagation()}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleApprove(proposal)}
                                        disabled={actionLoading}
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>אשר הצעה</TooltipContent>
                                  </Tooltip>
                                  {(proposal.evaluation_rank || proposal.evaluation_score != null) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => {
                                            setSelectedProposalForWhy(proposal);
                                            setWhyRecommendedOpen(true);
                                          }}
                                          className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                        >
                                          <HelpCircle className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>למה מומלץ?</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleNegotiationClick(proposal)}
                                        disabled={actionLoading || proposal.has_active_negotiation}
                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>דחה הצעה</TooltipContent>
                                  </Tooltip>
                                </div>
                              )}

                              {/* Expand/Collapse Button */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* Red Flags / Knockout Warning */}
                          {evalData?.flags?.knockout_triggered && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                              <div className="flex items-start gap-2" dir="rtl">
                                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="font-semibold text-red-900 dark:text-red-100 text-sm mb-1">נפסל מהערכה</div>
                                  <div className="text-xs text-red-700 dark:text-red-300">
                                    {evalData.flags.knockout_reason || 'ההצעה לא עומדת בדרישות המינימום'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {(() => {
                            // Filter out generic data quality notes that aren't true red flags
                            const meaningfulRedFlags = (evalData?.flags?.red_flags || []).filter((flag: string) => {
                              const genericPhrases = [
                                'no detailed scope', 'scope not defined', 'missing scope',
                                'lack of scope', 'incomplete data', 'missing data', 'no scope provided',
                                'scope not provided', 'limited scope', 'scope unclear'
                              ];
                              return !genericPhrases.some(phrase => 
                                flag.toLowerCase().includes(phrase.toLowerCase())
                              );
                            });
                            
                            if (meaningfulRedFlags.length === 0 || evalData?.flags?.knockout_triggered) return null;
                            
                            return (
                              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
                                <div className="flex items-start gap-2" dir="rtl">
                                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <div className="font-semibold text-orange-900 dark:text-orange-100 text-sm mb-1">דגלים אדומים</div>
                                    <ul className="list-disc list-inside space-y-0.5 text-xs text-orange-700 dark:text-orange-300">
                                      {meaningfulRedFlags.slice(0, 3).map((flag: string, idx: number) => (
                                        <li key={idx}>{flag}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t bg-muted/20 p-4 space-y-6 max-h-[50vh] overflow-y-auto" dir="rtl">
                            {/* Advisor Details Section */}
                            {proposal.advisor && (
                              <div>
                                <h3 className="font-semibold mb-3 text-right">פרטי הספק</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-background p-4 rounded-md border">
                                  <div className="text-right">
                                    <div className="text-muted-foreground text-xs mb-1">שם החברה</div>
                                    <div className="font-medium">{proposal.advisor.company_name || '-'}</div>
                                  </div>
                                  {proposal.advisor.profile?.name && (
                                    <div className="text-right">
                                      <div className="text-muted-foreground text-xs mb-1">איש קשר</div>
                                      <div>{proposal.advisor.profile.name}</div>
                                    </div>
                                  )}
                                  {proposal.advisor.profile?.phone && (
                                    <div className="text-right">
                                      <div className="text-muted-foreground text-xs mb-1">טלפון</div>
                                      <div dir="ltr" className="text-left">{proposal.advisor.profile.phone}</div>
                                    </div>
                                  )}
                                  {proposal.advisor.profile?.email && (
                                    <div className="text-right">
                                      <div className="text-muted-foreground text-xs mb-1">אימייל</div>
                                      <div dir="ltr" className="text-left break-all text-xs">{proposal.advisor.profile.email}</div>
                                    </div>
                                  )}
                                  {proposal.advisor.location && (
                                    <div className="text-right">
                                      <div className="text-muted-foreground text-xs mb-1">מיקום</div>
                                      <div>{proposal.advisor.location}</div>
                                    </div>
                                  )}
                                  {proposal.advisor.founding_year && (
                                    <div className="text-right">
                                      <div className="text-muted-foreground text-xs mb-1">שנת הקמה</div>
                                      <div>{proposal.advisor.founding_year}</div>
                                    </div>
                                  )}
                                  {proposal.advisor.office_size && (
                                    <div className="text-right">
                                      <div className="text-muted-foreground text-xs mb-1">גודל המשרד</div>
                                      <div>{proposal.advisor.office_size}</div>
                                    </div>
                                  )}
                                  {proposal.advisor.rating != null && proposal.advisor.rating > 0 && (
                                    <div className="text-right">
                                      <div className="text-muted-foreground text-xs mb-1">דירוג</div>
                                      <div className="flex items-center gap-1">
                                        <span>⭐</span>
                                        <span>{proposal.advisor.rating.toFixed(1)}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Fee Items Section */}
                            <div>
                              <h3 className="font-semibold mb-3 text-right flex items-center gap-2">
                                <span>פירוט שכר טרחה</span>
                              </h3>
                              {renderFeeItemsSection(proposal)}
                            </div>

                            {/* Payment Milestones */}
                            {(proposal.milestone_adjustments || []).length > 0 && (
                              <div>
                                <h3 className="font-semibold mb-3 text-right flex items-center gap-2">
                                  <span>אבני דרך לתשלום</span>
                                </h3>
                                {renderMilestonesSection(proposal)}
                              </div>
                            )}

                            {/* Consultant Notes */}
                            {proposal.consultant_request_notes && (
                              <div>
                                <h3 className="font-semibold mb-2 text-right">הערות היועץ</h3>
                                <div className="text-sm text-muted-foreground bg-background p-3 rounded-md border text-right whitespace-pre-wrap">
                                  {proposal.consultant_request_notes}
                                </div>
                              </div>
                            )}

                            {/* Scope Text */}
                            {proposal.scope_text && (
                              <div>
                                <h3 className="font-semibold mb-2 text-right">היקף העבודה</h3>
                                <div className="text-sm text-muted-foreground bg-background p-3 rounded-md border text-right whitespace-pre-wrap">
                                  {proposal.scope_text}
                                </div>
                              </div>
                            )}

                            {/* Terms */}
                            {proposal.terms && (
                              <div>
                                <h3 className="font-semibold mb-2 text-right">תנאים</h3>
                                <div className="text-sm text-muted-foreground bg-background p-3 rounded-md border text-right whitespace-pre-wrap">
                                  {proposal.terms}
                                </div>
                              </div>
                            )}

                            {/* Files */}
                            {(proposal.files || []).length > 0 && (
                              <div>
                                <h3 className="font-semibold mb-2 text-right">קבצים מצורפים</h3>
                                {renderFilesSection(proposal)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
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
          current_version: p.current_version,
          has_active_negotiation: p.has_active_negotiation,
        }))}
        onSuccess={() => {
          setBulkNegotiationDialogOpen(false);
          setSelectedProposalIds(new Set());
          fetchProposals();
        }}
      />

      <WhyRecommendedPanel
        open={whyRecommendedOpen}
        onOpenChange={setWhyRecommendedOpen}
        proposal={selectedProposalForWhy}
      />
    </Dialog>
  );
};
