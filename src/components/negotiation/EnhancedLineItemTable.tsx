import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

interface FeeLineItem {
  id?: string;
  item_number?: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total?: number;
  is_optional: boolean;
  comment?: string;
  charge_type?: string;
}

interface LineItemAdjustment {
  line_item_id: string;
  target_price: number;
  initiator_note?: string;
  new_quantity?: number;
}

interface ConsultantResponse {
  line_item_id: string;
  consultant_price: number;
  consultant_note?: string;
}

interface EnhancedLineItemTableProps {
  items: FeeLineItem[];
  adjustments?: LineItemAdjustment[];
  consultantResponses?: ConsultantResponse[];
  onAdjustmentChange?: (adjustments: LineItemAdjustment[]) => void;
  onConsultantResponseChange?: (responses: ConsultantResponse[]) => void;
  mode: 'view' | 'entrepreneur' | 'consultant';
  showOptionalItems?: boolean;
  className?: string;
}

export const EnhancedLineItemTable = ({
  items,
  adjustments = [],
  consultantResponses = [],
  onAdjustmentChange,
  onConsultantResponseChange,
  mode,
  showOptionalItems = true,
  className,
}: EnhancedLineItemTableProps) => {
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

  const getUnitLabel = (unit: string) => unitLabels[unit] || unit;

  const filteredItems = useMemo(() => {
    if (showOptionalItems) return items;
    return items.filter(item => !item.is_optional);
  }, [items, showOptionalItems]);

  const handleItemToggle = (itemId: string, checked: boolean) => {
    if (mode !== 'entrepreneur' || !onAdjustmentChange) return;

    const newSelected = new Set(selectedItems);
    const item = items.find(i => (i.id || `item-${i.item_number}`) === itemId);
    
    if (checked) {
      newSelected.add(itemId);
      if (item && !adjustments.find(a => a.line_item_id === itemId)) {
        const currentTotal = item.total || (item.unit_price * item.quantity);
        onAdjustmentChange([
          ...adjustments,
          {
            line_item_id: itemId,
            target_price: currentTotal,
          },
        ]);
      }
    } else {
      newSelected.delete(itemId);
      onAdjustmentChange(adjustments.filter(a => a.line_item_id !== itemId));
    }
    setSelectedItems(newSelected);
  };

  const handleTargetPriceChange = (itemId: string, price: number) => {
    if (!onAdjustmentChange) return;
    
    const existing = adjustments.find(a => a.line_item_id === itemId);
    if (existing) {
      onAdjustmentChange(
        adjustments.map(a => 
          a.line_item_id === itemId ? { ...a, target_price: price } : a
        )
      );
    }
  };

  const handleNoteChange = (itemId: string, note: string) => {
    if (!onAdjustmentChange) return;
    
    onAdjustmentChange(
      adjustments.map(a => 
        a.line_item_id === itemId ? { ...a, initiator_note: note } : a
      )
    );
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (!onAdjustmentChange) return;
    
    const item = items.find(i => (i.id || `item-${i.item_number}`) === itemId);
    if (!item) return;
    
    const newTotal = item.unit_price * quantity;
    onAdjustmentChange(
      adjustments.map(a => 
        a.line_item_id === itemId 
          ? { ...a, new_quantity: quantity, target_price: newTotal } 
          : a
      )
    );
  };

  const handleConsultantPriceChange = (itemId: string, price: number) => {
    if (!onConsultantResponseChange) return;
    
    const existing = consultantResponses.find(r => r.line_item_id === itemId);
    if (existing) {
      onConsultantResponseChange(
        consultantResponses.map(r => 
          r.line_item_id === itemId ? { ...r, consultant_price: price } : r
        )
      );
    } else {
      onConsultantResponseChange([
        ...consultantResponses,
        { line_item_id: itemId, consultant_price: price },
      ]);
    }
  };

  const totals = useMemo(() => {
    let originalTotal = 0;
    let targetTotal = 0;
    let newOfferTotal = 0;

    filteredItems.forEach(item => {
      const itemId = item.id || `item-${item.item_number}`;
      const itemTotal = item.total || (item.unit_price * item.quantity);
      
      // Include all items with a price > 0 in original total (mandatory + priced optional)
      if (itemTotal > 0) {
        originalTotal += itemTotal;
      }

      const adjustment = adjustments.find(a => a.line_item_id === itemId);
      if (adjustment) {
        targetTotal += adjustment.target_price;
      } else if (itemTotal > 0) {
        // Include all priced items that don't have adjustments
        targetTotal += itemTotal;
      }

      const response = consultantResponses.find(r => r.line_item_id === itemId);
      if (response) {
        newOfferTotal += response.consultant_price;
      } else if (adjustment) {
        newOfferTotal += adjustment.target_price;
      } else if (itemTotal > 0) {
        newOfferTotal += itemTotal;
      }
    });

    return { originalTotal, targetTotal, newOfferTotal };
  }, [filteredItems, adjustments, consultantResponses]);

  const reductionPercent = totals.originalTotal > 0
    ? Math.round(((totals.originalTotal - totals.targetTotal) / totals.originalTotal) * 100)
    : 0;

  // Determine columns based on mode
  const showCheckbox = mode === 'entrepreneur';
  const showTargetColumn = mode === 'entrepreneur' || mode === 'consultant';
  const showNewOfferColumn = mode === 'consultant';
  const showNotesColumn = mode === 'entrepreneur';
  const showEntrepreneurNotesColumn = mode === 'consultant';

  return (
    <div className={cn("space-y-4", className)} dir="rtl">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {showCheckbox && <TableHead className="w-10"></TableHead>}
              <TableHead className="min-w-[150px] text-start">תיאור</TableHead>
              <TableHead className="text-center w-20">יחידה</TableHead>
              <TableHead className="text-center w-20">כמות</TableHead>
              <TableHead className="text-start w-24">מחיר יח'</TableHead>
              <TableHead className="text-start w-24">סה"כ מקורי</TableHead>
              {showTargetColumn && (
                <TableHead className="text-start w-28">יעד המזמין</TableHead>
              )}
              {showNewOfferColumn && (
                <TableHead className="text-start w-28">הצעה חדשה</TableHead>
              )}
              {showNotesColumn && (
                <TableHead className="min-w-[120px] text-start">הערות</TableHead>
              )}
              {showEntrepreneurNotesColumn && (
                <TableHead className="min-w-[120px] text-start">הערות המזמין</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item, idx) => {
              const itemId = item.id || `item-${item.item_number || idx}`;
              const isSelected = selectedItems.has(itemId);
              const adjustment = adjustments.find(a => a.line_item_id === itemId);
              const response = consultantResponses.find(r => r.line_item_id === itemId);
              const itemTotal = item.total || (item.unit_price * item.quantity);
              const displayQuantity = adjustment?.new_quantity ?? item.quantity;

              return (
                <TableRow 
                  key={itemId}
                  className={cn(item.is_optional && "bg-muted/20")}
                >
                  {showCheckbox && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleItemToggle(itemId, !!checked)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.description}</span>
                      {item.is_optional && (
                        <Badge variant="outline" className="mr-2 text-xs">אופציונלי</Badge>
                      )}
                      {item.comment && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.comment}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      {getUnitLabel(item.unit)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {mode === 'entrepreneur' && isSelected ? (
                      <Input
                        type="number"
                        value={displayQuantity}
                        onChange={(e) => handleQuantityChange(itemId, parseFloat(e.target.value) || 1)}
                        className="w-16 text-center"
                        min={1}
                      />
                    ) : (
                      <span>{item.quantity}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-start">
                    {formatCurrency(item.unit_price)}
                  </TableCell>
                  <TableCell className="text-start font-medium">
                    {formatCurrency(itemTotal)}
                  </TableCell>
                  {showTargetColumn && (
                    <TableCell className="text-start">
                      {mode === 'entrepreneur' && isSelected ? (
                        <Input
                          type="number"
                          value={adjustment?.target_price || itemTotal}
                          onChange={(e) => handleTargetPriceChange(itemId, parseFloat(e.target.value) || 0)}
                          className="w-24"
                          dir="ltr"
                        />
                      ) : adjustment ? (
                        <span className="text-amber-600 font-medium">
                          {formatCurrency(adjustment.target_price)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {showNewOfferColumn && (
                    <TableCell className="text-start">
                      <Input
                        type="number"
                        value={response?.consultant_price ?? adjustment?.target_price ?? itemTotal}
                        onChange={(e) => handleConsultantPriceChange(itemId, parseFloat(e.target.value) || 0)}
                        className="w-24"
                        dir="ltr"
                      />
                    </TableCell>
                  )}
                  {showNotesColumn && (
                    <TableCell>
                      {isSelected && (
                        <Textarea
                          placeholder="הערה..."
                          value={adjustment?.initiator_note || ""}
                          onChange={(e) => handleNoteChange(itemId, e.target.value)}
                          className="min-h-[40px] text-sm resize-none"
                          rows={1}
                        />
                      )}
                    </TableCell>
                  )}
                  {showEntrepreneurNotesColumn && (
                    <TableCell>
                      {adjustment?.initiator_note && (
                        <p className="text-sm text-amber-600">{adjustment.initiator_note}</p>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/30">
              <TableCell colSpan={showCheckbox ? 5 : 4} className="text-start font-medium">
                סה"כ
              </TableCell>
              <TableCell className="text-start font-bold">
                {formatCurrency(totals.originalTotal)}
              </TableCell>
              {showTargetColumn && (
                <TableCell className="text-start font-bold text-amber-600">
                  {formatCurrency(totals.targetTotal)}
                  {reductionPercent > 0 && (
                    <span className="text-xs text-red-600 block">↓{reductionPercent}%</span>
                  )}
                </TableCell>
              )}
              {showNewOfferColumn && (
                <TableCell className="text-start font-bold text-green-600">
                  {formatCurrency(totals.newOfferTotal)}
                </TableCell>
              )}
              {showNotesColumn && <TableCell />}
              {showEntrepreneurNotesColumn && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default EnhancedLineItemTable;
