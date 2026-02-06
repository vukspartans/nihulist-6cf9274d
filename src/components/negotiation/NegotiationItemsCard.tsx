import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import type { FeeLineItem, JsonLineItemAdjustment, UpdatedLineItem } from "@/types/negotiation";
import { 
  getFeeUnitLabel, 
  getChargeTypeLabel, 
  getDurationUnitLabel, 
  isRecurringChargeType 
} from "@/constants/rfpUnits";

interface NegotiationItemsCardProps {
  item: FeeLineItem;
  index: number;
  itemId: string;
  adjustment?: JsonLineItemAdjustment;
  originalPrice: number;
  targetPrice: number;
  hasChange: boolean;
  isRemoved: boolean;
  changePercent: number;
  currentResponse?: UpdatedLineItem;
  isApproved: boolean;
  canRespond: boolean;
  formatCurrency: (amount: number) => string;
  onPriceChange: (lineItemId: string, price: number) => void;
  onApprovalChange: (itemId: string, approved: boolean, targetPrice: number) => void;
}

export const NegotiationItemsCard = memo(({
  item,
  index,
  itemId,
  adjustment,
  originalPrice,
  targetPrice,
  hasChange,
  isRemoved,
  changePercent,
  currentResponse,
  isApproved,
  canRespond,
  formatCurrency,
  onPriceChange,
  onApprovalChange,
}: NegotiationItemsCardProps) => {
  const isRecurring = item.charge_type && isRecurringChargeType(item.charge_type);
  const durationLabel = item.charge_type ? getDurationUnitLabel(item.charge_type) : '';
  
  return (
    <Card className={`${isRemoved ? "border-red-200 bg-red-50/30" : hasChange ? "border-amber-200 bg-amber-50/30" : ""}`}>
      <CardContent className="p-3 space-y-2">
        {/* Header with description and badge */}
        <div className="flex justify-between items-start gap-2">
          <p className={`font-medium text-sm flex-1 ${isRemoved ? "line-through text-muted-foreground" : ""}`}>
            {item.description}
          </p>
          {isRemoved ? (
            <Badge variant="destructive" className="text-xs flex-shrink-0">הוסר</Badge>
          ) : hasChange ? (
            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-xs flex-shrink-0">
              <span dir="ltr">-{changePercent}%</span>
            </Badge>
          ) : null}
        </div>

        {/* Unit and quantity info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{getFeeUnitLabel(item.unit || '') || 'יחידה'}</span>
          <span>×</span>
          <span>{adjustment?.quantity ?? item.quantity ?? 1}</span>
          {isRecurring && item.duration && (
            <>
              <span>×</span>
              <span>{item.duration} {durationLabel}</span>
            </>
          )}
        </div>

        {/* Price grid */}
        <div className="grid grid-cols-2 gap-2 text-sm pt-1">
          <div>
            <span className="text-muted-foreground text-xs">מקורי:</span>
            <span className="font-medium ms-1">{formatCurrency(originalPrice)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">יעד:</span>
            <span className={`font-medium ms-1 ${hasChange ? "text-amber-700" : ""}`}>
              {isRemoved ? "₪0" : formatCurrency(targetPrice)}
            </span>
          </div>
        </div>

        {/* Initiator note */}
        {adjustment?.initiator_note && (
          <p className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
            💬 {adjustment.initiator_note}
          </p>
        )}

        {/* Response input */}
        {canRespond && !isRemoved && (
          <div className="pt-2 border-t">
            {isApproved ? (
              <div className="flex items-center justify-between">
                <Badge className="bg-green-100 text-green-700 border-green-300 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  אושר - {formatCurrency(targetPrice)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onApprovalChange(itemId, false, targetPrice)}
                >
                  בטל
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex-shrink-0">הצעה:</span>
                <Input
                  type="number"
                  value={currentResponse?.consultant_response_price ?? targetPrice}
                  onChange={(e) => onPriceChange(itemId, parseFloat(e.target.value) || 0)}
                  className="h-8 flex-1 text-sm"
                />
                {hasChange && (
                  <Checkbox
                    checked={false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onApprovalChange(itemId, true, targetPrice);
                      }
                    }}
                    className="h-4 w-4 flex-shrink-0"
                    title="אשר מחיר יעד"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

NegotiationItemsCard.displayName = "NegotiationItemsCard";
