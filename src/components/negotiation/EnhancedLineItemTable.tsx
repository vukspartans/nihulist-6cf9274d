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
  target_unit_price: number;  // Target per-unit price
  target_total: number;       // Calculated: target_unit_price × quantity
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
  // Track which items have been manually modified (for visual feedback)
  const [modifiedItems, setModifiedItems] = useState<Set<string>>(
    new Set(adjustments.map((a) => a.line_item_id))
  );
  
  // Local editing state to prevent controlled input issues
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUnitLabel = (unit: string) => unitLabels[unit] || unit;

  // Helper to generate stable item ID - MUST be consistent everywhere
  const getItemId = (item: FeeLineItem, idx: number): string => {
    if (item.id) return item.id;
    if (item.item_number !== undefined) return `item-${item.item_number}`;
    return `idx-${idx}`;
  };

  const filteredItems = useMemo(() => {
    if (showOptionalItems) return items;
    return items.filter(item => !item.is_optional);
  }, [items, showOptionalItems]);

  // Helper to ensure adjustment exists for an item
  const ensureAdjustment = (
    itemId: string, 
    originalUnitPrice: number, 
    originalQuantity: number, 
    updates: Partial<LineItemAdjustment>
  ): LineItemAdjustment[] => {
    const existing = adjustments.find(a => a.line_item_id === itemId);
    if (existing) {
      return adjustments.map(a => 
        a.line_item_id === itemId ? { ...a, ...updates } : a
      );
    } else {
      // Default: use original values
      const qty = updates.new_quantity ?? originalQuantity;
      const unitPrice = updates.target_unit_price ?? originalUnitPrice;
      return [
        ...adjustments,
        { 
          line_item_id: itemId, 
          target_unit_price: unitPrice,
          target_total: unitPrice * qty,
          ...updates 
        }
      ];
    }
  };

  // Handle target UNIT price change - recalculate total
  const handleTargetUnitPriceChange = (
    itemId: string, 
    originalUnitPrice: number, 
    originalQuantity: number, 
    targetUnitPrice: number
  ) => {
    if (!onAdjustmentChange) return;
    
    // Get current quantity (adjusted or original)
    const adjustment = adjustments.find(a => a.line_item_id === itemId);
    const quantity = adjustment?.new_quantity ?? originalQuantity;
    const targetTotal = targetUnitPrice * quantity;
    
    setModifiedItems(prev => new Set(prev).add(itemId));
    onAdjustmentChange(ensureAdjustment(itemId, originalUnitPrice, originalQuantity, { 
      target_unit_price: targetUnitPrice,
      target_total: targetTotal
    }));
  };

  const handleNoteChange = (
    itemId: string, 
    originalUnitPrice: number, 
    originalQuantity: number, 
    note: string
  ) => {
    if (!onAdjustmentChange) return;
    
    setModifiedItems(prev => new Set(prev).add(itemId));
    onAdjustmentChange(ensureAdjustment(itemId, originalUnitPrice, originalQuantity, { initiator_note: note }));
  };

  // Handle quantity change - recalculate total using target unit price if set
  const handleQuantityChange = (
    itemId: string, 
    originalUnitPrice: number, 
    originalQuantity: number, 
    quantity: number
  ) => {
    if (!onAdjustmentChange) return;
    
    // Use target unit price if set, otherwise use original unit price
    const adjustment = adjustments.find(a => a.line_item_id === itemId);
    const unitPriceToUse = adjustment?.target_unit_price ?? originalUnitPrice;
    const newTotal = unitPriceToUse * quantity;
    
    setModifiedItems(prev => new Set(prev).add(itemId));
    onAdjustmentChange(ensureAdjustment(itemId, originalUnitPrice, originalQuantity, { 
      new_quantity: quantity,
      target_unit_price: unitPriceToUse,
      target_total: newTotal 
    }));
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

    filteredItems.forEach((item, idx) => {
      const itemId = getItemId(item, idx);
      const itemTotal = item.total || (item.unit_price * item.quantity);
      
      // Include all items with a price > 0 in original total (mandatory + priced optional)
      if (itemTotal > 0) {
        originalTotal += itemTotal;
      }

      const adjustment = adjustments.find(a => a.line_item_id === itemId);
      if (adjustment) {
        // Use the calculated target_total from adjustment (could be 0 for "removed" items)
        targetTotal += adjustment.target_total;
      } else if (itemTotal > 0) {
        // No adjustment = use original
        targetTotal += itemTotal;
      }

      const response = consultantResponses.find(r => r.line_item_id === itemId);
      if (response) {
        newOfferTotal += response.consultant_price;
      } else if (adjustment) {
        newOfferTotal += adjustment.target_total;
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
              <TableHead className="min-w-[150px] text-start">תיאור</TableHead>
              <TableHead className="text-center w-20">יחידה</TableHead>
              <TableHead className="text-center w-20">כמות</TableHead>
              <TableHead className="text-start w-24">מחיר יח'</TableHead>
              <TableHead className="text-start w-24">סה"כ מקורי</TableHead>
              {showTargetColumn && (
                <>
                  <TableHead className="text-start w-24">מחיר יעד ליח'</TableHead>
                  <TableHead className="text-start w-24">סה"כ יעד</TableHead>
                </>
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
              const itemId = getItemId(item, idx);
              const adjustment = adjustments.find(a => a.line_item_id === itemId);
              const response = consultantResponses.find(r => r.line_item_id === itemId);
              const itemTotal = item.total || (item.unit_price * item.quantity);
              const displayQuantity = adjustment?.new_quantity ?? item.quantity;
              
              // Calculate displayed target unit price and total
              const displayTargetUnitPrice = adjustment?.target_unit_price ?? item.unit_price;
              const displayTargetTotal = adjustment?.target_total ?? itemTotal;
              
              // Check if item is "removed" (target total set to 0)
              const isRemoved = adjustment?.target_total === 0;
              const hasAdjustment = !!adjustment;

              return (
                <TableRow 
                  key={itemId}
                  className={cn(
                    item.is_optional && "bg-muted/20",
                    isRemoved && "opacity-60 bg-destructive/5"
                  )}
                >
                  <TableCell>
                    <div className={cn(isRemoved && "text-muted-foreground")}>
                      <span className={cn(
                        "font-medium",
                        isRemoved && "line-through"
                      )}>
                        {item.description}
                      </span>
                      {item.is_optional && (
                        <Badge variant="outline" className="mr-2 text-xs">אופציונלי</Badge>
                      )}
                      {isRemoved && (
                        <Badge variant="destructive" className="mr-2 text-xs">הוסר</Badge>
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
                    {mode === 'entrepreneur' ? (
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={
                          editingValues[`qty-${itemId}`] !== undefined
                            ? editingValues[`qty-${itemId}`]
                            : displayQuantity.toString()
                        }
                        onChange={(e) => {
                          setEditingValues(prev => ({ ...prev, [`qty-${itemId}`]: e.target.value }));
                        }}
                        onBlur={(e) => {
                          const rawValue = e.target.value.replace(/[^\d.-]/g, '');
                          const qty = parseFloat(rawValue) || 0;
                          handleQuantityChange(itemId, item.unit_price, item.quantity, qty);
                          setEditingValues(prev => {
                            const next = { ...prev };
                            delete next[`qty-${itemId}`];
                            return next;
                          });
                        }}
                        className={cn(
                          "w-16 text-center",
                          isRemoved && "bg-muted text-muted-foreground"
                        )}
                      />
                    ) : (
                      <span className={cn(isRemoved && "line-through")}>{item.quantity}</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-start", isRemoved && "text-muted-foreground")}>
                    <span className={cn(isRemoved && "line-through")}>
                      {formatCurrency(item.unit_price)}
                    </span>
                  </TableCell>
                  <TableCell className={cn(
                    "text-start font-medium",
                    isRemoved && "text-muted-foreground"
                  )}>
                    <span className={cn(isRemoved && "line-through")}>
                      {formatCurrency(itemTotal)}
                    </span>
                  </TableCell>
                  {showTargetColumn && (
                    <>
                      {/* Target Unit Price column */}
                      <TableCell className="text-start">
                        {mode === 'entrepreneur' ? (
                          <div className="relative">
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">₪</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={
                                editingValues[`price-${itemId}`] !== undefined
                                  ? editingValues[`price-${itemId}`]
                                  : displayTargetUnitPrice.toLocaleString('he-IL')
                              }
                              onChange={(e) => {
                                setEditingValues(prev => ({ ...prev, [`price-${itemId}`]: e.target.value }));
                              }}
                              onBlur={(e) => {
                                const rawValue = e.target.value.replace(/[^\d.-]/g, '');
                                handleTargetUnitPriceChange(itemId, item.unit_price, item.quantity, parseFloat(rawValue) || 0);
                                setEditingValues(prev => {
                                  const next = { ...prev };
                                  delete next[`price-${itemId}`];
                                  return next;
                                });
                              }}
                              className={cn(
                                "w-24 pr-6",
                                isRemoved && "bg-destructive/10 text-destructive border-destructive/30"
                              )}
                              dir="ltr"
                            />
                          </div>
                        ) : adjustment ? (
                          <span className={cn(
                            "font-medium",
                            isRemoved ? "text-destructive" : "text-amber-600"
                          )}>
                            {isRemoved ? "-" : formatCurrency(adjustment.target_unit_price)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {/* Target Total column (calculated, read-only) */}
                      <TableCell className={cn(
                        "text-start font-medium",
                        isRemoved && "text-destructive"
                      )}>
                        {isRemoved ? (
                          <Badge variant="destructive" className="text-xs">הוסר</Badge>
                        ) : (
                          <span className={cn(
                            adjustment ? "text-amber-600" : "text-muted-foreground"
                          )}>
                            {formatCurrency(displayTargetTotal)}
                          </span>
                        )}
                      </TableCell>
                    </>
                  )}
                  {showNewOfferColumn && (
                    <TableCell className="text-start">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={(response?.consultant_price ?? adjustment?.target_total ?? itemTotal).toLocaleString('he-IL')}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/,/g, '');
                          handleConsultantPriceChange(itemId, parseFloat(rawValue) || 0);
                        }}
                        className="w-24"
                        dir="ltr"
                      />
                    </TableCell>
                  )}
                  {showNotesColumn && (
                    <TableCell>
                      <Textarea
                        placeholder="הערה..."
                        value={adjustment?.initiator_note || ""}
                        onChange={(e) => handleNoteChange(itemId, item.unit_price, item.quantity, e.target.value)}
                        className={cn(
                          "min-h-[40px] text-sm resize-none",
                          isRemoved && "bg-muted"
                        )}
                        rows={1}
                      />
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
              <TableCell colSpan={4} className="text-start font-medium">
                סה"כ
              </TableCell>
              <TableCell className="text-start font-bold">
                {formatCurrency(totals.originalTotal)}
              </TableCell>
              {showTargetColumn && (
                <>
                  <TableCell className="text-start text-muted-foreground">-</TableCell>
                  <TableCell className="text-start font-bold text-amber-600">
                    {formatCurrency(totals.targetTotal)}
                    {reductionPercent !== 0 && (
                      <span className={cn(
                        "text-xs block",
                        reductionPercent > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {reductionPercent > 0 ? `↓${reductionPercent}%` : `↑${Math.abs(reductionPercent)}%`}
                      </span>
                    )}
                  </TableCell>
                </>
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
