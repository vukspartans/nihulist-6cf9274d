import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Eye, Clock, Package, ChevronDown, ChevronUp, FileText, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeeLineItem {
  item_id?: string;
  description: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  is_optional?: boolean;
  is_entrepreneur_defined?: boolean;
  comment?: string;
}

interface Proposal {
  id: string;
  advisor_id: string;
  supplier_name: string;
  price: number;
  timeline_days: number;
  submitted_at: string;
  status: string;
  scope_text?: string;
  files?: any[];
  signature_blob?: string;
  fee_line_items?: FeeLineItem[];
  current_version?: number;
  has_active_negotiation?: boolean;
  advisors?: {
    id: string;
    company_name: string;
    logo_url: string | null;
    expertise: string[];
    rating: number | null;
    location: string | null;
  };
  rfp_invite?: {
    advisor_type?: string;
    request_title?: string;
    deadline_at?: string;
  };
}

interface ProposalComparisonTableProps {
  proposals: Proposal[];
  onViewProposal: (proposal: Proposal) => void;
  onCompareByType?: (proposals: Proposal[], vendorType: string) => void;
  loading?: boolean;
}

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return '-';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { variant: any; label: string }> = {
    submitted: { variant: 'outline', label: 'ממתין' },
    accepted: { variant: 'success', label: '✓ אושר' },
    rejected: { variant: 'destructive', label: 'נדחה' },
    withdrawn: { variant: 'muted', label: 'בוטל' },
    resubmitted: { variant: 'secondary', label: '🔄 מעודכן' },
    negotiation_requested: { variant: 'warning', label: '💬 משא״מ' },
  };

  const config = statusConfig[status] || { variant: 'secondary', label: status };
  return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
};

export const ProposalComparisonTable = ({ 
  proposals, 
  onViewProposal,
  onCompareByType,
  loading = false 
}: ProposalComparisonTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Calculate stats
  const lowestPrice = useMemo(() => {
    if (proposals.length === 0) return null;
    return Math.min(...proposals.map(p => p.price));
  }, [proposals]);

  // Calculate mandatory and optional totals from fee_line_items
  const calculateTotals = (feeItems: FeeLineItem[] | undefined) => {
    if (!feeItems || feeItems.length === 0) return { mandatory: 0, optional: 0 };
    
    let mandatory = 0;
    let optional = 0;
    
    feeItems.forEach(item => {
      const itemTotal = item.total ?? (item.quantity ?? 1) * (item.unit_price ?? 0);
      if (item.is_optional) {
        optional += itemTotal;
      } else {
        mandatory += itemTotal;
      }
    });
    
    return { mandatory, optional };
  };

  // Sort proposals: accepted first, then by status priority
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      const statusOrder: Record<string, number> = { 
        'accepted': 0, 
        'resubmitted': 1, 
        'submitted': 2, 
        'negotiation_requested': 3, 
        'rejected': 4 
      };
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });
  }, [proposals]);

  // Group proposals by vendor type
  const groupedProposals = useMemo(() => {
    const groups: Record<string, Proposal[]> = {};
    
    sortedProposals.forEach(proposal => {
      const type = proposal.rfp_invite?.advisor_type || 'אחר';
      if (!groups[type]) groups[type] = [];
      groups[type].push(proposal);
    });
    
    return groups;
  }, [sortedProposals]);

  const vendorTypes = Object.keys(groupedProposals);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">טוען הצעות מחיר...</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">מחכה להצעות מחיר</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          הזמנות נשלחו לספקים והם יגיבו בקרוב. 
          ההצעות יופיעו כאן ברגע שיתקבלו.
        </p>
      </div>
    );
  }

  // Render table for a group of proposals
  const renderProposalTable = (typeProposals: Proposal[]) => {
    const typeLowestPrice = Math.min(...typeProposals.map(p => p.price));

    return (
      <>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right w-10"></TableHead>
                <TableHead className="text-right">ספק</TableHead>
                <TableHead className="text-right">סה״כ מחיר</TableHead>
                <TableHead className="text-right">חובה</TableHead>
                <TableHead className="text-right">אופציונלי</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-center w-20">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typeProposals.map((proposal) => {
                const isLowestPrice = typeLowestPrice === proposal.price;
                const isExpanded = expandedRows.has(proposal.id);
                const { mandatory, optional } = calculateTotals(proposal.fee_line_items);
                const hasFeeItems = proposal.fee_line_items && proposal.fee_line_items.length > 0;

                return (
                  <>
                    <TableRow 
                      key={proposal.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        proposal.status === 'accepted' && "bg-green-50 dark:bg-green-950/20"
                      )}
                      onClick={() => onViewProposal(proposal)}
                    >
                      {/* Expand toggle */}
                      <TableCell className="p-2">
                        {hasFeeItems && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(proposal.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>

                      {/* Supplier */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {proposal.advisors?.logo_url ? (
                            <img 
                              src={proposal.advisors.logo_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border">
                              <span className="text-xs font-bold text-primary">
                                {(proposal.advisors?.company_name || proposal.supplier_name).charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[150px]">
                              {proposal.advisors?.company_name || proposal.supplier_name}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {proposal.files && proposal.files.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <FileText className="w-3 h-3" />
                                  {proposal.files.length}
                                </span>
                              )}
                              {proposal.signature_blob && (
                                <span className="flex items-center gap-0.5 text-green-600">
                                  <FileSignature className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Price */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-primary">
                            {formatCurrency(proposal.price)}
                          </span>
                          {isLowestPrice && (
                            <Badge variant="success" className="text-xs px-1 py-0">
                              נמוך
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Mandatory Total */}
                      <TableCell>
                        <span className="text-sm">
                          {hasFeeItems ? formatCurrency(mandatory) : '-'}
                        </span>
                      </TableCell>

                      {/* Optional Total */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {hasFeeItems && optional > 0 ? formatCurrency(optional) : '-'}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {getStatusBadge(proposal.status)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProposal(proposal);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Fee Items Row */}
                    {isExpanded && hasFeeItems && (
                      <TableRow key={`${proposal.id}-expanded`} className="bg-muted/30">
                        <TableCell colSpan={7} className="p-0">
                          <div className="p-4 border-t">
                            <h4 className="text-sm font-semibold mb-3">פירוט שכר טרחה</h4>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="text-right text-xs">תיאור</TableHead>
                                    <TableHead className="text-right text-xs">יחידה</TableHead>
                                    <TableHead className="text-right text-xs">כמות</TableHead>
                                    <TableHead className="text-right text-xs">מחיר יח׳</TableHead>
                                    <TableHead className="text-right text-xs">סה״כ</TableHead>
                                    <TableHead className="text-right text-xs">סוג</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {proposal.fee_line_items!.map((item, idx) => {
                                    const itemTotal = item.total ?? (item.quantity ?? 1) * (item.unit_price ?? 0);
                                    return (
                                      <TableRow key={idx} className={item.is_optional ? 'text-muted-foreground' : ''}>
                                        <TableCell className="text-xs">{item.description}</TableCell>
                                        <TableCell className="text-xs">{item.unit || '-'}</TableCell>
                                        <TableCell className="text-xs">{item.quantity ?? 1}</TableCell>
                                        <TableCell className="text-xs">{formatCurrency(item.unit_price)}</TableCell>
                                        <TableCell className="text-xs font-medium">{formatCurrency(itemTotal)}</TableCell>
                                        <TableCell className="text-xs">
                                          {item.is_optional ? (
                                            <Badge variant="outline" className="text-xs">אופציונלי</Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-xs">חובה</Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {typeProposals.map((proposal) => {
            const isLowestPrice = typeLowestPrice === proposal.price;
            const { mandatory, optional } = calculateTotals(proposal.fee_line_items);
            const hasFeeItems = proposal.fee_line_items && proposal.fee_line_items.length > 0;
            const isExpanded = expandedRows.has(proposal.id);

            return (
              <Card 
                key={proposal.id}
                className={cn(
                  "cursor-pointer hover:shadow-md transition-shadow",
                  proposal.status === 'accepted' && "border-green-500"
                )}
              >
                <CardContent className="p-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-2" onClick={() => onViewProposal(proposal)}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {proposal.advisors?.logo_url ? (
                        <img 
                          src={proposal.advisors.logo_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {(proposal.advisors?.company_name || proposal.supplier_name).charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {proposal.advisors?.company_name || proposal.supplier_name}
                        </p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {getStatusBadge(proposal.status)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProposal(proposal);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Price Row */}
                  <div className="mb-2 text-sm">
                    <span className="text-muted-foreground text-xs">סה״כ מחיר:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-primary">{formatCurrency(proposal.price)}</span>
                      {isLowestPrice && <Badge variant="success" className="text-xs px-1 py-0">נמוך</Badge>}
                    </div>
                  </div>

                  {/* Mandatory/Optional Row */}
                  {hasFeeItems && (
                    <div className="grid grid-cols-2 gap-2 mb-2 text-sm border-t pt-2">
                      <div>
                        <span className="text-muted-foreground text-xs">חובה:</span>
                        <p className="font-medium">{formatCurrency(mandatory)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">אופציונלי:</span>
                        <p className="text-muted-foreground">{optional > 0 ? formatCurrency(optional) : '-'}</p>
                      </div>
                    </div>
                  )}

                  {/* Expandable Fee Items */}
                  {hasFeeItems && (
                    <Collapsible open={isExpanded} onOpenChange={() => toggleRow(proposal.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full h-7 text-xs mt-1">
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3 ml-1" />
                              הסתר פירוט
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 ml-1" />
                              הצג פירוט שכר טרחה
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="border rounded-lg p-2 bg-muted/30 space-y-2">
                          {proposal.fee_line_items!.map((item, idx) => {
                            const itemTotal = item.total ?? (item.quantity ?? 1) * (item.unit_price ?? 0);
                            return (
                              <div 
                                key={idx} 
                                className={cn(
                                  "flex justify-between items-center text-xs p-2 rounded",
                                  item.is_optional ? "bg-muted/50" : "bg-background"
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="truncate">{item.description}</p>
                                  <p className="text-muted-foreground">
                                    {item.quantity ?? 1} × {formatCurrency(item.unit_price)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="font-medium">{formatCurrency(itemTotal)}</span>
                                  {item.is_optional && (
                                    <Badge variant="outline" className="text-xs">אופ׳</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <Accordion type="multiple" defaultValue={vendorTypes} className="space-y-4">
      {vendorTypes.map(vendorType => {
        const typeProposals = groupedProposals[vendorType];
        const submittedCount = typeProposals.filter(p => 
          p.status === 'submitted' || p.status === 'resubmitted'
        ).length;

        return (
          <AccordionItem key={vendorType} value={vendorType} className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{vendorType}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {typeProposals.length} הצעות
                  </span>
                </div>
                {submittedCount > 1 && onCompareByType && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompareByType(typeProposals, vendorType);
                    }}
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    השווה ({submittedCount})
                  </Button>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {renderProposalTable(typeProposals)}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
