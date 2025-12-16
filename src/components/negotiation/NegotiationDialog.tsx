import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LineItemEditor } from "./LineItemEditor";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useLineItems } from "@/hooks/useLineItems";
import { useProposalVersions } from "@/hooks/useProposalVersions";
import type { LineItemAdjustment, NegotiationCommentInput, CommentType } from "@/types/negotiation";
import { RefreshCw, FileText, ClipboardList, Calendar, CreditCard, MessageSquare } from "lucide-react";

interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    id: string;
    price: number;
    supplier_name: string;
    project_id: string;
    current_version?: number;
  };
  onSuccess?: () => void;
}

const commentTypes: { type: CommentType; label: string; icon: React.ReactNode }[] = [
  { type: "document", label: "מסמכים", icon: <FileText className="h-4 w-4" /> },
  { type: "scope", label: "היקף עבודה", icon: <ClipboardList className="h-4 w-4" /> },
  { type: "milestone", label: "אבני דרך", icon: <Calendar className="h-4 w-4" /> },
  { type: "payment", label: "תנאי תשלום", icon: <CreditCard className="h-4 w-4" /> },
];

export const NegotiationDialog = ({
  open,
  onOpenChange,
  proposal,
  onSuccess,
}: NegotiationDialogProps) => {
  const [activeTab, setActiveTab] = useState("items");
  const [adjustments, setAdjustments] = useState<LineItemAdjustment[]>([]);
  const [globalComment, setGlobalComment] = useState("");
  const [comments, setComments] = useState<Record<CommentType, string>>({
    document: "",
    scope: "",
    milestone: "",
    payment: "",
    general: "",
  });

  const { createNegotiationSession, loading } = useNegotiation();
  const { lineItems, loading: lineItemsLoading } = useLineItems(proposal.id);
  const { getLatestVersion } = useProposalVersions(proposal.id);

  const latestVersion = getLatestVersion();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTargetTotal = (): number => {
    let total = 0;
    lineItems.forEach((item) => {
      const adj = adjustments.find((a) => a.line_item_id === item.id);
      if (adj) {
        if (adj.adjustment_type === "price_change") {
          total += adj.adjustment_value;
        } else if (adj.adjustment_type === "flat_discount") {
          total += item.total - adj.adjustment_value;
        } else if (adj.adjustment_type === "percentage_discount") {
          total += item.total * (1 - adj.adjustment_value / 100);
        }
      } else if (!item.is_optional) {
        total += item.total;
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    if (!latestVersion) {
      console.error("No version found for proposal");
      return;
    }

    const negotiationComments: NegotiationCommentInput[] = Object.entries(comments)
      .filter(([_, content]) => content.trim())
      .map(([type, content]) => ({
        comment_type: type as CommentType,
        content: content.trim(),
      }));

    const result = await createNegotiationSession({
      project_id: proposal.project_id,
      proposal_id: proposal.id,
      negotiated_version_id: latestVersion.id,
      target_total: calculateTargetTotal(),
      global_comment: globalComment || undefined,
      line_item_adjustments: adjustments.length > 0 ? adjustments : undefined,
      comments: negotiationComments.length > 0 ? negotiationComments : undefined,
    });

    if (result) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleClose = () => {
    setAdjustments([]);
    setGlobalComment("");
    setComments({
      document: "",
      scope: "",
      milestone: "",
      payment: "",
      general: "",
    });
    onOpenChange(false);
  };

  const targetTotal = calculateTargetTotal();
  const reductionPercent =
    proposal.price > 0
      ? Math.round(((proposal.price - targetTotal) / proposal.price) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-amber-600" />
            בקשת הצעה מחודשת - {proposal.supplier_name}
          </DialogTitle>
          <DialogDescription>
            ערוך את הפריטים והוסף הערות לבקשת עדכון ההצעה
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="items">פריטים</TabsTrigger>
            <TabsTrigger value="comments">הערות</TabsTrigger>
            <TabsTrigger value="summary">סיכום</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            {lineItemsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : lineItems.length > 0 ? (
              <LineItemEditor
                lineItems={lineItems}
                adjustments={adjustments}
                onAdjustmentChange={setAdjustments}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>אין פריטים מפורטים בהצעה זו</p>
                <p className="text-sm mt-1">
                  ניתן להוסיף הערות כלליות בלשונית "הערות"
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-4 space-y-4">
            {commentTypes.map(({ type, label, icon }) => (
              <div key={type} className="space-y-2">
                <Label className="flex items-center gap-2">
                  {icon}
                  {label}
                </Label>
                <Textarea
                  placeholder={`הערות לגבי ${label}...`}
                  value={comments[type]}
                  onChange={(e) =>
                    setComments({ ...comments, [type]: e.target.value })
                  }
                  className="min-h-[60px]"
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">מחיר מקורי:</span>
                <span className="font-medium">
                  {formatCurrency(proposal.price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">מחיר יעד:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(targetTotal)}
                </span>
              </div>
              {reductionPercent > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">הפחתה:</span>
                  <span className="text-red-600 font-medium">
                    ↓ {reductionPercent}%
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                הערה כללית
              </Label>
              <Textarea
                placeholder="הודעה כללית ליועץ..."
                value={globalComment}
                onChange={(e) => setGlobalComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row-reverse gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin me-2" />
                שולח...
              </>
            ) : (
              "שלח בקשה לעדכון"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
