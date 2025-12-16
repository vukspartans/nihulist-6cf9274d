import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ProposalLineItem, AdjustmentType, LineItemAdjustment } from "@/types/negotiation";
import { cn } from "@/lib/utils";

interface LineItemEditorProps {
  lineItems: ProposalLineItem[];
  adjustments: LineItemAdjustment[];
  onAdjustmentChange: (adjustments: LineItemAdjustment[]) => void;
  readOnly?: boolean;
  showTargetColumn?: boolean;
  targetPrices?: Record<string, number>;
  className?: string;
}

export const LineItemEditor = ({
  lineItems,
  adjustments,
  onAdjustmentChange,
  readOnly = false,
  showTargetColumn = false,
  targetPrices = {},
  className,
}: LineItemEditorProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(adjustments.map((a) => a.line_item_id))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTargetPrice = (
    originalPrice: number,
    adjustmentType: AdjustmentType,
    adjustmentValue: number
  ): number => {
    switch (adjustmentType) {
      case "price_change":
        return adjustmentValue;
      case "flat_discount":
        return originalPrice - adjustmentValue;
      case "percentage_discount":
        return originalPrice * (1 - adjustmentValue / 100);
      default:
        return originalPrice;
    }
  };

  const handleItemToggle = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
      // Add default adjustment
      const item = lineItems.find((li) => li.id === itemId);
      if (item && !adjustments.find((a) => a.line_item_id === itemId)) {
        onAdjustmentChange([
          ...adjustments,
          {
            line_item_id: itemId,
            adjustment_type: "price_change",
            adjustment_value: item.total,
          },
        ]);
      }
    } else {
      newSelected.delete(itemId);
      onAdjustmentChange(adjustments.filter((a) => a.line_item_id !== itemId));
    }
    setSelectedItems(newSelected);
  };

  const handleAdjustmentTypeChange = (
    itemId: string,
    type: AdjustmentType
  ) => {
    const item = lineItems.find((li) => li.id === itemId);
    if (!item) return;

    const existing = adjustments.find((a) => a.line_item_id === itemId);
    const defaultValue =
      type === "price_change"
        ? item.total
        : type === "flat_discount"
        ? 0
        : 10;

    if (existing) {
      onAdjustmentChange(
        adjustments.map((a) =>
          a.line_item_id === itemId
            ? { ...a, adjustment_type: type, adjustment_value: defaultValue }
            : a
        )
      );
    } else {
      onAdjustmentChange([
        ...adjustments,
        {
          line_item_id: itemId,
          adjustment_type: type,
          adjustment_value: defaultValue,
        },
      ]);
    }
  };

  const handleAdjustmentValueChange = (itemId: string, value: number) => {
    onAdjustmentChange(
      adjustments.map((a) =>
        a.line_item_id === itemId ? { ...a, adjustment_value: value } : a
      )
    );
  };

  const handleNoteChange = (itemId: string, note: string) => {
    onAdjustmentChange(
      adjustments.map((a) =>
        a.line_item_id === itemId ? { ...a, initiator_note: note } : a
      )
    );
  };

  const totals = useMemo(() => {
    let originalTotal = 0;
    let targetTotal = 0;

    lineItems.forEach((item) => {
      if (!item.is_optional || selectedItems.has(item.id)) {
        originalTotal += item.total;
      }

      const adjustment = adjustments.find((a) => a.line_item_id === item.id);
      if (adjustment) {
        targetTotal += calculateTargetPrice(
          item.total,
          adjustment.adjustment_type,
          adjustment.adjustment_value
        );
      } else if (!item.is_optional || selectedItems.has(item.id)) {
        targetTotal += item.total;
      }
    });

    return { originalTotal, targetTotal };
  }, [lineItems, adjustments, selectedItems]);

  const reductionPercent =
    totals.originalTotal > 0
      ? Math.round(
          ((totals.originalTotal - totals.targetTotal) / totals.originalTotal) *
            100
        )
      : 0;

  return (
    <div className={cn("space-y-4", className)} dir="rtl">
      <Table>
        <TableHeader>
          <TableRow>
            {!readOnly && <TableHead className="w-10"></TableHead>}
            <TableHead>פריט</TableHead>
            <TableHead className="text-center">כמות</TableHead>
            <TableHead className="text-left">מחיר מקורי</TableHead>
            {!readOnly && <TableHead className="text-center">התאמה</TableHead>}
            {showTargetColumn && (
              <TableHead className="text-left">יעד היזם</TableHead>
            )}
            <TableHead className="text-left">
              {readOnly ? "הצעה חדשה" : "סה״כ יעד"}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item) => {
            const adjustment = adjustments.find(
              (a) => a.line_item_id === item.id
            );
            const isSelected = selectedItems.has(item.id);
            const targetPrice = adjustment
              ? calculateTargetPrice(
                  item.total,
                  adjustment.adjustment_type,
                  adjustment.adjustment_value
                )
              : item.total;

            return (
              <TableRow
                key={item.id}
                className={cn(item.is_optional && "bg-muted/30")}
              >
                {!readOnly && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleItemToggle(item.id, !!checked)
                      }
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.is_optional && (
                      <span className="text-xs text-muted-foreground mr-2">
                        (אופציונלי)
                      </span>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-left font-medium">
                  {formatCurrency(item.total)}
                </TableCell>

                {!readOnly && (
                  <TableCell>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={adjustment?.adjustment_type || "price_change"}
                          onValueChange={(value) =>
                            handleAdjustmentTypeChange(
                              item.id,
                              value as AdjustmentType
                            )
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="price_change">
                              מחיר חדש
                            </SelectItem>
                            <SelectItem value="flat_discount">הנחה ₪</SelectItem>
                            <SelectItem value="percentage_discount">
                              הנחה %
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={adjustment?.adjustment_value || 0}
                          onChange={(e) =>
                            handleAdjustmentValueChange(
                              item.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24"
                        />
                      </div>
                    )}
                  </TableCell>
                )}

                {showTargetColumn && (
                  <TableCell className="text-left text-amber-600 font-medium">
                    {targetPrices[item.id]
                      ? formatCurrency(targetPrices[item.id])
                      : "-"}
                  </TableCell>
                )}

                <TableCell
                  className={cn(
                    "text-left font-semibold",
                    adjustment && targetPrice < item.total && "text-green-600"
                  )}
                >
                  {isSelected || !item.is_optional
                    ? formatCurrency(targetPrice)
                    : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Totals */}
      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
        <div>
          <Label className="text-sm text-muted-foreground">סה״כ מקורי</Label>
          <p className="text-lg font-semibold">
            {formatCurrency(totals.originalTotal)}
          </p>
        </div>
        <div className="text-center">
          {reductionPercent > 0 && (
            <span className="text-red-600 font-medium">
              ↓ {reductionPercent}%
            </span>
          )}
        </div>
        <div className="text-left">
          <Label className="text-sm text-muted-foreground">סה״כ יעד</Label>
          <p
            className={cn(
              "text-lg font-bold",
              reductionPercent > 0 && "text-green-600"
            )}
          >
            {formatCurrency(totals.targetTotal)}
          </p>
        </div>
      </div>
    </div>
  );
};
