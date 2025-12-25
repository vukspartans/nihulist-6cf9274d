import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Users } from "lucide-react";

interface ProposalForBulk {
  id: string;
  price: number;
  supplier_name: string;
  project_id: string;
  current_version?: number;
}

interface BulkNegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposals: ProposalForBulk[];
  onSuccess?: () => void;
}

export const BulkNegotiationDialog = ({
  open,
  onOpenChange,
  proposals,
  onSuccess,
}: BulkNegotiationDialogProps) => {
  const { toast } = useToast();
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(
    new Set(proposals.map((p) => p.id))
  );
  const [reductionType, setReductionType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [reductionValue, setReductionValue] = useState(10);
  const [bulkMessage, setBulkMessage] = useState("");
  const [sendingProgress, setSendingProgress] = useState(0);
  const [skippedProposals, setSkippedProposals] = useState<string[]>([]);

  const { createNegotiationSession, loading } = useNegotiation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleProposal = (proposalId: string) => {
    const newSelected = new Set(selectedProposals);
    if (newSelected.has(proposalId)) {
      newSelected.delete(proposalId);
    } else {
      newSelected.add(proposalId);
    }
    setSelectedProposals(newSelected);
  };

  const calculateTargetPrice = (originalPrice: number): number => {
    if (reductionType === "percent") {
      return originalPrice * (1 - reductionValue / 100);
    }
    return originalPrice - reductionValue;
  };

  const handleSubmit = async () => {
    const selectedList = proposals.filter((p) => selectedProposals.has(p.id));
    let successCount = 0;
    const skipped: string[] = [];

    for (let i = 0; i < selectedList.length; i++) {
      const proposal = selectedList[i];
      setSendingProgress(Math.round(((i + 1) / selectedList.length) * 100));

      // Get latest version for proposal
      const { data: versions } = await supabase
        .from("proposal_versions")
        .select("id")
        .eq("proposal_id", proposal.id)
        .order("version_number", { ascending: false })
        .limit(1);

      let versionId = versions?.[0]?.id;
      
      // If no version exists, create one from the proposal data
      if (!versionId) {
        const { data: proposalData } = await supabase
          .from("proposals")
          .select("price, timeline_days, scope_text, terms, conditions_json")
          .eq("id", proposal.id)
          .single();
        
        if (proposalData) {
          const { data: newVersion, error: versionError } = await supabase
            .from("proposal_versions")
            .insert({
              proposal_id: proposal.id,
              version_number: 1,
              price: proposalData.price,
              timeline_days: proposalData.timeline_days,
              scope_text: proposalData.scope_text,
              terms: proposalData.terms,
              conditions_json: proposalData.conditions_json,
              change_reason: "גרסה ראשונית",
            })
            .select("id")
            .single();
          
          if (versionError || !newVersion) {
            console.error("[BulkNegotiation] Failed to create version for", proposal.id);
            skipped.push(proposal.supplier_name);
            continue;
          }
          versionId = newVersion.id;
        } else {
          skipped.push(proposal.supplier_name);
          continue;
        }
      }

      const result = await createNegotiationSession({
        project_id: proposal.project_id,
        proposal_id: proposal.id,
        negotiated_version_id: versionId,
        target_total: calculateTargetPrice(proposal.price),
        target_reduction_percent:
          reductionType === "percent" ? reductionValue : undefined,
        global_comment: bulkMessage || undefined,
        bulk_message: bulkMessage || undefined,
      });

      if (result && !('existingSession' in result)) {
        successCount++;
      }
    }

    setSkippedProposals(skipped);

    if (skipped.length > 0) {
      toast({
        title: "חלק מהבקשות לא נשלחו",
        description: `הבקשות ל-${skipped.join(", ")} לא נשלחו`,
        variant: "destructive",
      });
    }

    if (successCount > 0) {
      onOpenChange(false);
      onSuccess?.();
    }

    setSendingProgress(0);
  };

  const handleClose = () => {
    setSelectedProposals(new Set(proposals.map((p) => p.id)));
    setReductionType("percent");
    setReductionValue(10);
    setBulkMessage("");
    setSendingProgress(0);
    setSkippedProposals([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            בקשת הצעה מחודשת מרובה
          </DialogTitle>
          <DialogDescription>
            שלח בקשת עדכון לכל היועצים שנבחרו
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected Proposals */}
          <div className="space-y-2">
            <Label>נבחרו {selectedProposals.size} הצעות:</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedProposals.has(proposal.id)}
                      onCheckedChange={() => toggleProposal(proposal.id)}
                    />
                    <span>{proposal.supplier_name}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(proposal.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reduction Target */}
          <div className="space-y-3">
            <Label>יעד הפחתה:</Label>
            <RadioGroup
              value={reductionType}
              onValueChange={(v) => setReductionType(v as "percent" | "fixed")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="percent" id="percent" />
                <Label htmlFor="percent">אחוזים</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed">סכום קבוע</Label>
              </div>
            </RadioGroup>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={reductionValue}
                onChange={(e) =>
                  setReductionValue(parseFloat(e.target.value) || 0)
                }
                className="w-24"
              />
              <span className="text-muted-foreground">
                {reductionType === "percent" ? "%" : "₪"}
              </span>
            </div>
          </div>

          {/* Bulk Message */}
          <div className="space-y-2">
            <Label>הודעה לכל הספקים:</Label>
            <Textarea
              placeholder="אנא עדכנו את הצעתכם בהתאם..."
              value={bulkMessage}
              onChange={(e) => setBulkMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Progress */}
          {sendingProgress > 0 && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${sendingProgress}%` }}
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                שולח... {sendingProgress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedProposals.size === 0}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin me-2" />
                שולח...
              </>
            ) : (
              `שלח ל-${selectedProposals.size} יועצים`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
