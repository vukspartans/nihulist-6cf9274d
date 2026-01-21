import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface MilestonePayment {
  id?: string;
  name: string;
  percentage: number;
  trigger?: string;
  description?: string;
}

export interface MilestoneAdjustment {
  milestone_id: string;
  original_percentage: number;
  target_percentage: number;
  initiator_note?: string;
}

interface MilestoneNegotiationTableProps {
  milestones: MilestonePayment[];
  adjustments: MilestoneAdjustment[];
  onAdjustmentChange: (adjustments: MilestoneAdjustment[]) => void;
  originalTotal: number;  // Original proposal total
  targetTotal: number;    // Target total after item adjustments
  className?: string;
}

export const MilestoneNegotiationTable = ({
  milestones,
  adjustments,
  onAdjustmentChange,
  originalTotal,
  targetTotal,
  className,
}: MilestoneNegotiationTableProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const selectedMilestones = useMemo(() => {
    return new Set(adjustments.map(a => a.milestone_id));
  }, [adjustments]);

  const handleToggle = (milestoneId: string, checked: boolean) => {
    const milestone = milestones.find(m => (m.id || m.name) === milestoneId);
    if (!milestone) return;

    if (checked) {
      onAdjustmentChange([
        ...adjustments,
        {
          milestone_id: milestoneId,
          original_percentage: milestone.percentage,
          target_percentage: milestone.percentage,
        }
      ]);
    } else {
      onAdjustmentChange(adjustments.filter(a => a.milestone_id !== milestoneId));
    }
  };

  const handlePercentageChange = (milestoneId: string, percentage: number) => {
    const existing = adjustments.find(a => a.milestone_id === milestoneId);
    if (existing) {
      onAdjustmentChange(
        adjustments.map(a =>
          a.milestone_id === milestoneId ? { ...a, target_percentage: percentage } : a
        )
      );
    } else {
      const milestone = milestones.find(m => (m.id || m.name) === milestoneId);
      if (milestone) {
        onAdjustmentChange([
          ...adjustments,
          {
            milestone_id: milestoneId,
            original_percentage: milestone.percentage,
            target_percentage: percentage,
          }
        ]);
      }
    }
  };

  const handleNoteChange = (milestoneId: string, note: string) => {
    const existing = adjustments.find(a => a.milestone_id === milestoneId);
    if (existing) {
      onAdjustmentChange(
        adjustments.map(a =>
          a.milestone_id === milestoneId ? { ...a, initiator_note: note } : a
        )
      );
    } else {
      const milestone = milestones.find(m => (m.id || m.name) === milestoneId);
      if (milestone) {
        onAdjustmentChange([
          ...adjustments,
          {
            milestone_id: milestoneId,
            original_percentage: milestone.percentage,
            target_percentage: milestone.percentage,
            initiator_note: note,
          }
        ]);
      }
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    let originalTotal = 0;
    let targetTotal = 0;

    milestones.forEach(milestone => {
      const milestoneId = milestone.id || milestone.name;
      originalTotal += milestone.percentage;

      const adjustment = adjustments.find(a => a.milestone_id === milestoneId);
      if (adjustment) {
        targetTotal += adjustment.target_percentage;
      } else {
        targetTotal += milestone.percentage;
      }
    });

    return { originalTotal, targetTotal };
  }, [milestones, adjustments]);

  const isValidTotal = Math.abs(totals.targetTotal - 100) < 0.01;

  return (
    <div className={cn("space-y-4", className)} dir="rtl">
      {!isValidTotal && adjustments.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            סה״כ אחוזי אבני הדרך חייב להיות 100%. כרגע: {totals.targetTotal.toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10"></TableHead>
              <TableHead className="min-w-[150px] text-start">אבן דרך</TableHead>
              <TableHead className="text-center w-24">אחוז מקורי</TableHead>
              <TableHead className="text-start w-28">סכום מקורי</TableHead>
              <TableHead className="text-center w-24">אחוז יעד</TableHead>
              <TableHead className="text-start w-28">סכום יעד</TableHead>
              <TableHead className="min-w-[120px] text-start">הערות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((milestone, idx) => {
              const milestoneId = milestone.id || milestone.name;
              const isSelected = selectedMilestones.has(milestoneId);
              const adjustment = adjustments.find(a => a.milestone_id === milestoneId);
              const originalAmount = (milestone.percentage / 100) * originalTotal;
              const targetPercentage = adjustment?.target_percentage ?? milestone.percentage;
              const targetAmount = (targetPercentage / 100) * targetTotal;

              return (
                <TableRow key={milestoneId}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleToggle(milestoneId, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{milestone.name}</span>
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{milestone.description}</p>
                      )}
                      {milestone.trigger && (
                        <p className="text-xs text-muted-foreground mt-0.5">טריגר: {milestone.trigger}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {milestone.percentage}%
                  </TableCell>
                  <TableCell className="text-start">
                    {formatCurrency(originalAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {isSelected ? (
                      <Input
                        type="number"
                        value={targetPercentage}
                        onChange={(e) => handlePercentageChange(milestoneId, parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                        min={0}
                        max={100}
                        step={5}
                        dir="ltr"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-start">
                    {isSelected ? (
                      <span className={cn(
                        "font-medium",
                        targetAmount !== originalAmount && "text-amber-600"
                      )}>
                        {formatCurrency(targetAmount)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSelected && (
                      <Textarea
                        placeholder="הערה..."
                        value={adjustment?.initiator_note || ""}
                        onChange={(e) => handleNoteChange(milestoneId, e.target.value)}
                        className="min-h-[40px] text-sm resize-none"
                        rows={1}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/30">
              <TableCell colSpan={2} className="text-start font-medium">
                סה"כ
              </TableCell>
              <TableCell className="text-center font-bold">
                {totals.originalTotal}%
              </TableCell>
              <TableCell className="text-start font-bold">
                {formatCurrency(originalTotal)}
              </TableCell>
              <TableCell className={cn(
                "text-center font-bold",
                !isValidTotal && adjustments.length > 0 && "text-destructive"
              )}>
                {adjustments.length > 0 ? `${totals.targetTotal}%` : "-"}
              </TableCell>
              <TableCell className="text-start font-bold text-amber-600">
                {adjustments.length > 0 ? formatCurrency(targetTotal) : "-"}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default MilestoneNegotiationTable;
