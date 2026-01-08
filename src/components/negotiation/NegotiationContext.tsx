import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  ClipboardList, 
  CreditCard, 
  Calendar, 
  Package,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeeItem {
  id?: string;
  item_number?: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price?: number;
  charge_type?: string;
  is_optional: boolean;
  display_order?: number;
}

interface MilestonePayment {
  description: string;
  percentage: number;
  trigger?: string;
}

interface PaymentTerms {
  advance_percent?: number;
  milestone_payments?: MilestonePayment[];
  payment_term_type?: string;
  notes?: string;
}

interface RFPContextData {
  requestTitle?: string;
  requestContent?: string;
  serviceDetailsText?: string;
  feeItems: FeeItem[];
  optionalFeeItems: FeeItem[];
  paymentTerms?: PaymentTerms;
}

interface ProposalContextData {
  feeLineItems: FeeItem[];
  milestoneAdjustments?: MilestonePayment[];
  consultantNotes?: string;
  servicesNotes?: string;
  totalPrice: number;
}

interface NegotiationContextProps {
  proposalId: string;
  advisorId?: string;
  projectId?: string;
  showRFPContext?: boolean;
  showProposalContext?: boolean;
  className?: string;
}

// Unit labels in Hebrew
const unitLabels: Record<string, string> = {
  lump_sum: "קומפ'",
  sqm: 'מ"ר',
  unit: "יח'",
  hourly: 'ש"ע',
  per_consultant: "לי\"ע",
  per_floor: "לקומה",
  percentage: "%",
};

const chargeTypeLabels: Record<string, string> = {
  one_time: "חד פעמי",
  monthly: "חודשי",
  hourly: 'לש"ע',
  per_visit: "לביקור",
  per_unit: "ליח'",
};

const paymentTermLabels: Record<string, string> = {
  current: "שוטף",
  net_30: "שוטף + 30",
  net_60: "שוטף + 60",
  net_90: "שוטף + 90",
};

export const NegotiationContext = ({
  proposalId,
  advisorId,
  projectId,
  showRFPContext = true,
  showProposalContext = true,
  className,
}: NegotiationContextProps) => {
  const [rfpContext, setRfpContext] = useState<RFPContextData | null>(null);
  const [proposalContext, setProposalContext] = useState<ProposalContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rfpExpanded, setRfpExpanded] = useState(true);
  const [proposalExpanded, setProposalExpanded] = useState(true);

  useEffect(() => {
    if (proposalId) {
      loadContextData();
    }
  }, [proposalId, advisorId, projectId]);

  const loadContextData = async () => {
    setLoading(true);
    try {
      // Load proposal data
      const { data: proposal } = await supabase
        .from("proposals")
        .select(`
          id,
          price,
          advisor_id,
          project_id,
          fee_line_items,
          milestone_adjustments,
          consultant_request_notes,
          services_notes
        `)
        .eq("id", proposalId)
        .single();

      if (proposal) {
        // Parse fee_line_items JSONB
        const feeItems = Array.isArray(proposal.fee_line_items)
          ? (proposal.fee_line_items as unknown as FeeItem[])
          : [];
        
        const milestones = Array.isArray(proposal.milestone_adjustments)
          ? (proposal.milestone_adjustments as unknown as MilestonePayment[])
          : [];

        setProposalContext({
          feeLineItems: feeItems,
          milestoneAdjustments: milestones,
          consultantNotes: proposal.consultant_request_notes as string | undefined,
          servicesNotes: proposal.services_notes as string | undefined,
          totalPrice: proposal.price,
        });

        // Load RFP context if we have advisor_id and project_id
        const advId = advisorId || proposal.advisor_id;
        const projId = projectId || proposal.project_id;

        if (showRFPContext && advId && projId) {
          // Find the RFP invite for this advisor and project
          const { data: rfpInvite } = await supabase
            .from("rfp_invites")
            .select(`
              id,
              request_title,
              request_content,
              service_details_text,
              payment_terms,
              rfps!inner(project_id)
            `)
            .eq("advisor_id", advId)
            .eq("rfps.project_id", projId)
            .maybeSingle();

          if (rfpInvite) {
            // Fetch RFP fee items
            const { data: feeItemsData } = await supabase
              .from("rfp_request_fee_items")
              .select("*")
              .eq("rfp_invite_id", rfpInvite.id)
              .order("display_order", { ascending: true });

            const allFeeItems = feeItemsData || [];
            const requiredItems = allFeeItems.filter(item => !item.is_optional);
            const optionalItems = allFeeItems.filter(item => item.is_optional);

            setRfpContext({
              requestTitle: rfpInvite.request_title as string | undefined,
              requestContent: rfpInvite.request_content as string | undefined,
              serviceDetailsText: rfpInvite.service_details_text as string | undefined,
              feeItems: requiredItems.map(item => ({
                id: item.id,
                item_number: item.item_number,
                description: item.description,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: item.unit_price,
                charge_type: item.charge_type,
                is_optional: item.is_optional,
                display_order: item.display_order,
              })),
              optionalFeeItems: optionalItems.map(item => ({
                id: item.id,
                item_number: item.item_number,
                description: item.description,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: item.unit_price,
                charge_type: item.charge_type,
                is_optional: item.is_optional,
                display_order: item.display_order,
              })),
              paymentTerms: rfpInvite.payment_terms as PaymentTerms | undefined,
            });
          }
        }
      }
    } catch (error) {
      console.error("[NegotiationContext] Error loading context:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUnitLabel = (unit: string) => unitLabels[unit] || unit;
  const getChargeTypeLabel = (type: string) => chargeTypeLabels[type] || type;
  const getPaymentTermLabel = (type: string) => paymentTermLabels[type] || type;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>טוען נתונים...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} dir="rtl">
      {/* RFP Context - What Was Requested */}
      {showRFPContext && rfpContext && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                מה התבקש (בקשת ההצעה)
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRfpExpanded(!rfpExpanded)}
              >
                {rfpExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {rfpExpanded && (
            <CardContent className="space-y-4">
              {/* Request Title & Content */}
              {rfpContext.requestTitle && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">כותרת הבקשה</h4>
                  <p className="font-medium">{rfpContext.requestTitle}</p>
                </div>
              )}
              {rfpContext.requestContent && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">תיאור הבקשה</h4>
                  <p className="text-sm whitespace-pre-wrap">{rfpContext.requestContent}</p>
                </div>
              )}

              {/* Fee Items Table */}
              {rfpContext.feeItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">פריטי שכ"ט שהתבקשו</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-right">#</th>
                          <th className="px-3 py-2 text-right">תיאור</th>
                          <th className="px-3 py-2 text-center">יחידה</th>
                          <th className="px-3 py-2 text-center">כמות</th>
                          <th className="px-3 py-2 text-center">סוג חיוב</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfpContext.feeItems.map((item, idx) => (
                          <tr key={item.id || idx} className="border-t">
                            <td className="px-3 py-2">{item.item_number || idx + 1}</td>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-center">{getUnitLabel(item.unit)}</td>
                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                            <td className="px-3 py-2 text-center">{getChargeTypeLabel(item.charge_type || 'one_time')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Optional Fee Items */}
              {rfpContext.optionalFeeItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    פריטים אופציונליים
                    <Badge variant="secondary" className="mr-2">אופציונלי</Badge>
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-3 py-2 text-right">#</th>
                          <th className="px-3 py-2 text-right">תיאור</th>
                          <th className="px-3 py-2 text-center">יחידה</th>
                          <th className="px-3 py-2 text-center">כמות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfpContext.optionalFeeItems.map((item, idx) => (
                          <tr key={item.id || idx} className="border-t bg-muted/10">
                            <td className="px-3 py-2">{item.item_number || idx + 1}</td>
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-center">{getUnitLabel(item.unit)}</td>
                            <td className="px-3 py-2 text-center">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Terms */}
              {rfpContext.paymentTerms && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    תנאי תשלום
                  </h4>
                  <div className="bg-muted/30 p-3 rounded-lg space-y-2 text-sm">
                    {rfpContext.paymentTerms.payment_term_type && (
                      <p>
                        <span className="text-muted-foreground">תנאי תשלום: </span>
                        <span className="font-medium">{getPaymentTermLabel(rfpContext.paymentTerms.payment_term_type)}</span>
                      </p>
                    )}
                    {rfpContext.paymentTerms.advance_percent !== undefined && rfpContext.paymentTerms.advance_percent > 0 && (
                      <p>
                        <span className="text-muted-foreground">מקדמה: </span>
                        <span className="font-medium">{rfpContext.paymentTerms.advance_percent}%</span>
                      </p>
                    )}
                    {rfpContext.paymentTerms.milestone_payments && rfpContext.paymentTerms.milestone_payments.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">אבני דרך:</span>
                        <ul className="mt-1 space-y-1">
                          {rfpContext.paymentTerms.milestone_payments.map((milestone, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{milestone.description}</span>
                              <span className="font-medium">{milestone.percentage}%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {rfpContext.paymentTerms.notes && (
                      <p className="text-muted-foreground">{rfpContext.paymentTerms.notes}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Proposal Context - What Was Offered */}
      {showProposalContext && proposalContext && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                ההצעה שהוגשה
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProposalExpanded(!proposalExpanded)}
              >
                {proposalExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {proposalExpanded && (
            <CardContent className="space-y-4">
              {/* Consultant Notes */}
              {proposalContext.consultantNotes && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">הערות היועץ</h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                    {proposalContext.consultantNotes}
                  </p>
                </div>
              )}

              {/* Fee Line Items */}
              {proposalContext.feeLineItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">פירוט שכ"ט</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                        <th className="px-3 py-2 text-start">תיאור</th>
                        <th className="px-3 py-2 text-center">יחידה</th>
                        <th className="px-3 py-2 text-center">כמות</th>
                        <th className="px-3 py-2 text-start">מחיר יח'</th>
                        <th className="px-3 py-2 text-start">סה"כ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposalContext.feeLineItems.map((item, idx) => {
                          const total = (item.unit_price || 0) * (item.quantity || 1);
                          return (
                            <tr key={idx} className={cn("border-t", item.is_optional && "bg-muted/20")}>
                              <td className="px-3 py-2 text-start">
                                {item.description}
                                {item.is_optional && (
                                  <Badge variant="outline" className="mr-2 text-xs">אופציונלי</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">{getUnitLabel(item.unit)}</td>
                              <td className="px-3 py-2 text-center">{item.quantity}</td>
                              <td className="px-3 py-2 text-start font-mono">{formatCurrency(item.unit_price || 0)}</td>
                              <td className="px-3 py-2 text-start font-mono font-medium">{formatCurrency(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/30">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-start font-medium">סה"כ הצעה</td>
                          <td className="px-3 py-2 text-start font-bold">{formatCurrency(proposalContext.totalPrice)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Milestone Adjustments */}
              {proposalContext.milestoneAdjustments && proposalContext.milestoneAdjustments.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    אבני דרך לתשלום
                  </h4>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <ul className="space-y-2 text-sm">
                      {proposalContext.milestoneAdjustments.map((milestone, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{milestone.description}</span>
                          <span className="font-medium">{milestone.percentage}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Services Notes */}
              {proposalContext.servicesNotes && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">הערות לשירותים</h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                    {proposalContext.servicesNotes}
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default NegotiationContext;
