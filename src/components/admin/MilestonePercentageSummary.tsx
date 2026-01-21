import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MilestoneTemplate } from "@/types/milestoneTemplate";

interface MilestonePercentageSummaryProps {
  milestones: MilestoneTemplate[];
}

export function MilestonePercentageSummary({ milestones }: MilestonePercentageSummaryProps) {
  const totalPercentage = milestones
    .filter(m => m.is_active)
    .reduce((sum, m) => sum + Number(m.percentage_of_total), 0);

  const isOverLimit = totalPercentage > 100;
  const isPerfect = totalPercentage === 100;

  return (
    <div className="bg-card rounded-lg border p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          סה"כ אחוזים מוגדרים
        </span>
        <div className="flex items-center gap-2">
          {isPerfect ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : isOverLimit ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : null}
          <span
            className={cn(
              "text-lg font-bold",
              isPerfect && "text-green-500",
              isOverLimit && "text-destructive"
            )}
          >
            {totalPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
      <Progress
        value={Math.min(totalPercentage, 100)}
        className={cn(
          "h-2",
          isOverLimit && "[&>div]:bg-destructive"
        )}
      />
      {isOverLimit && (
        <p className="text-xs text-destructive mt-2">
          סה"כ האחוזים חורג מ-100%. יש לעדכן את אבני הדרך.
        </p>
      )}
    </div>
  );
}
