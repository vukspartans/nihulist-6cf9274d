import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";

interface NegotiationPriceSummaryProps {
  originalTotal: number;
  targetTotal: number;
  newTotal?: number;
  reductionPercent: number;
  newReductionPercent?: number;
  formatCurrency: (amount: number) => string;
  variant?: "overview" | "response";
}

export const NegotiationPriceSummary = memo(({
  originalTotal,
  targetTotal,
  newTotal,
  reductionPercent,
  newReductionPercent,
  formatCurrency,
  variant = "overview",
}: NegotiationPriceSummaryProps) => {
  if (variant === "response" && newTotal !== undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
        <div className="p-3 bg-white rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">מחיר מקורי</p>
          <p className="text-lg font-bold">{formatCurrency(originalTotal)}</p>
        </div>
        <div className="p-3 bg-amber-100 rounded-lg">
          <p className="text-xs text-amber-700 mb-1">יעד היזם</p>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(targetTotal)}</p>
        </div>
        <div className="p-3 bg-green-100 rounded-lg border border-green-200">
          <p className="text-xs text-green-700 mb-1">ההצעה שלך</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(newTotal)}</p>
          <Badge variant="outline" className="mt-1 text-xs border-green-400 text-green-700">
            <span dir="ltr">
              {newReductionPercent && newReductionPercent > 0 ? `-${newReductionPercent}%` : 'ללא הנחה'}
            </span>
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
      <div className="p-3 sm:p-4 bg-white/60 rounded-lg">
        <p className="text-xs text-muted-foreground mb-1">מחיר מקורי</p>
        <p className="text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(originalTotal)}</p>
      </div>
      <div className="p-3 sm:p-4 bg-amber-100/60 rounded-lg border border-amber-200">
        <p className="text-xs text-amber-700 mb-1">מחיר יעד מבוקש</p>
        <p className="text-xl sm:text-2xl font-bold text-amber-700">{formatCurrency(targetTotal)}</p>
        <Badge variant="outline" className="mt-1 text-xs border-amber-400 text-amber-700">
          <span dir="ltr">
            {reductionPercent > 0 ? `-${reductionPercent}%` : 'ללא שינוי'}
          </span>
        </Badge>
      </div>
      <div className="p-3 sm:p-4 bg-white/60 rounded-lg">
        <p className="text-xs text-muted-foreground mb-1">הפרש מבוקש</p>
        <p className="text-xl sm:text-2xl font-bold text-red-600">
          {formatCurrency(originalTotal - targetTotal)}
        </p>
      </div>
    </div>
  );
});

NegotiationPriceSummary.displayName = "NegotiationPriceSummary";
