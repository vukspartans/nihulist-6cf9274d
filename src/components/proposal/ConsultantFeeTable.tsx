import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Trash2, AlertCircle, MessageSquare, Shield, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RFPFeeItem, FeeUnit, ChargeType } from '@/types/rfpRequest';

// Unit display labels in Hebrew
const UNIT_LABELS: Record<FeeUnit, string> = {
  lump_sum: "קומפ'",
  sqm: 'מ"ר',
  unit: "יח'",
  hourly: 'ש"ע',
  per_consultant: "לי\"ע",
  per_floor: 'לקומה',
  percentage: '%',
};

const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  one_time: 'חד פעמי',
  monthly: 'חודשי',
  hourly: 'לש"ע',
  per_visit: 'לביקור',
  per_unit: "ליח'",
};

export interface ConsultantFeeRow extends RFPFeeItem {
  consultant_unit_price?: number | null;
  consultant_comment?: string;
  is_entrepreneur_defined: boolean;
}

interface ConsultantFeeTableProps {
  entrepreneurItems: RFPFeeItem[];
  consultantPrices: Record<string, number | null>;
  onPriceChange: (itemId: string, price: number | null) => void;
  additionalItems: ConsultantFeeRow[];
  onAddItem: (isOptional: boolean) => void;
  onRemoveItem: (index: number) => void;
  onUpdateAdditionalItem: (index: number, field: keyof ConsultantFeeRow, value: any) => void;
  rowComments: Record<string, string>;
  onCommentChange: (itemId: string, comment: string) => void;
  errors?: Record<string, string>;
}

export function ConsultantFeeTable({
  entrepreneurItems,
  consultantPrices,
  onPriceChange,
  additionalItems,
  onAddItem,
  onRemoveItem,
  onUpdateAdditionalItem,
  rowComments,
  onCommentChange,
  errors = {},
}: ConsultantFeeTableProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const toggleComment = (itemId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedComments(newExpanded);
  };

  const formatPrice = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return value.toLocaleString('he-IL');
  };

  const parsePrice = (value: string): number | null => {
    const cleaned = value.replace(/[^\d]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  };

  // Calculate totals
  const entrepreneurTotal = entrepreneurItems.reduce((sum, item) => {
    const price = consultantPrices[item.id || ''] ?? 0;
    const qty = item.quantity || 1;
    return sum + (price * qty);
  }, 0);

  const additionalTotal = additionalItems.reduce((sum, item) => {
    const price = item.consultant_unit_price ?? 0;
    const qty = item.quantity || 1;
    return sum + (price * qty);
  }, 0);

  const grandTotal = entrepreneurTotal + additionalTotal;

  // Calculate mandatory vs optional totals
  const mandatoryItems = entrepreneurItems.filter(item => !item.is_optional);
  const optionalItems = entrepreneurItems.filter(item => item.is_optional);
  
  const mandatoryTotal = mandatoryItems.reduce((sum, item) => {
    const price = consultantPrices[item.id || ''] ?? 0;
    const qty = item.quantity || 1;
    return sum + (price * qty);
  }, 0);
  
  const optionalTotal = optionalItems.reduce((sum, item) => {
    const price = consultantPrices[item.id || ''] ?? 0;
    const qty = item.quantity || 1;
    return sum + (price * qty);
  }, 0);

  const totalItemsCount = entrepreneurItems.length + additionalItems.length;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Table Header with Title and Description */}
        <div className="space-y-1">
          <h3 className="font-semibold text-base flex items-center gap-2">
            פירוט שכר טרחה
            <Badge variant="secondary" className="text-xs">
              {totalItemsCount} פריטים
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            הזן מחיר ליחידה עבור כל פריט. פריטי חובה יכללו תמיד בהצעה.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="min-w-[200px]">השירות</TableHead>
              <TableHead className="w-24 text-center">יחידת מדידה</TableHead>
              <TableHead className="w-20 text-center">כמות</TableHead>
              <TableHead className="w-32 text-center">מחיר ליחידה (₪)</TableHead>
              <TableHead className="w-28 text-center">סה"כ לפריט</TableHead>
              <TableHead className="w-16 text-center">הערות</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Entrepreneur-defined items */}
            {entrepreneurItems.map((item, index) => {
              const itemId = item.id || `ent-${index}`;
              const price = consultantPrices[itemId];
              const hasComment = rowComments[itemId]?.trim();
              const needsComment = (price === null || price === undefined) && !hasComment;
              const isExpanded = expandedComments.has(itemId);
              const rowTotal = (price ?? 0) * (item.quantity || 1);

              return (
                <>
                <TableRow 
                  key={itemId}
                  className={cn(
                    // MUST items - warm + thick border
                    !item.is_optional && "bg-amber-50/60 dark:bg-amber-950/30 border-r-4 border-r-amber-500",
                    // OPTIONAL items - neutral + thin border
                    item.is_optional && "bg-slate-50/50 dark:bg-slate-900/20 border-r-2 border-r-slate-300",
                    // Warning override for validation
                    needsComment && "bg-orange-50 dark:bg-orange-950/20 border-r-orange-400"
                  )}
                >
                    <TableCell className="text-center font-medium">
                      {item.item_number}
                    </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Icon based on type */}
                      <Tooltip>
                        <TooltipTrigger>
                          {item.is_optional ? (
                            <Info className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Shield className="h-3.5 w-3.5 text-amber-600" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.is_optional 
                            ? 'פריט אופציונלי - הכללתו לבחירתך' 
                            : 'פריט חובה - חייב להיכלל בהצעה'}
                        </TooltipContent>
                      </Tooltip>
                      
                      {/* Description text with weight based on type */}
                      <span className={cn(
                        !item.is_optional && "font-medium"
                      )}>
                        {item.description}
                      </span>
                      
                      {/* Badge - always show, style based on type */}
                      <Badge 
                        className={cn(
                          "text-xs shrink-0 ml-1 gap-1",
                          item.is_optional 
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-200 dark:border-amber-700"
                        )}
                      >
                        {item.is_optional ? (
                          <>
                            <Info className="h-3 w-3" />
                            אופציונלי
                          </>
                        ) : (
                          <>
                            <Shield className="h-3 w-3" />
                            חובה
                          </>
                        )}
                      </Badge>
                    </div>
                  </TableCell>
                    <TableCell className="text-center">
                      {UNIT_LABELS[item.unit] || item.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Input
                          type="text"
                          value={price !== null && price !== undefined ? formatPrice(price) : ''}
                          onChange={(e) => onPriceChange(itemId, parsePrice(e.target.value))}
                          placeholder="הזן מחיר"
                          className={cn(
                            "text-left pr-6",
                            needsComment && "border-orange-400 focus:ring-orange-400"
                          )}
                          dir="ltr"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₪</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {rowTotal > 0 ? `₪${formatPrice(rowTotal)}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant={hasComment ? "default" : "ghost"}
                        size="icon"
                        onClick={() => toggleComment(itemId)}
                        className={cn(
                          "h-8 w-8",
                          needsComment && "text-orange-600 hover:text-orange-700"
                        )}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      {/* Lock icon - can't delete entrepreneur items */}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${itemId}-comment`} className="bg-muted/30">
                      <TableCell colSpan={8} className="p-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            הערות לפריט
                            {needsComment && (
                              <span className="text-orange-600 text-xs flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                נדרשת הערה אם לא מוזן מחיר
                              </span>
                            )}
                          </label>
                          <Textarea
                            value={rowComments[itemId] || ''}
                            onChange={(e) => onCommentChange(itemId, e.target.value)}
                            placeholder="הוסף הערה או הסבר לגבי המחיר..."
                            rows={2}
                            className={cn(needsComment && "border-orange-400")}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}

            {/* Consultant-added items */}
            {additionalItems.map((item, index) => {
              const itemId = `add-${index}`;
              const isExpanded = expandedComments.has(itemId);
              const rowTotal = (item.consultant_unit_price ?? 0) * (item.quantity || 1);

              return (
                <>
                <TableRow 
                  key={itemId} 
                  className={cn(
                    !item.is_optional && "bg-amber-50/60 dark:bg-amber-950/30 border-r-4 border-r-amber-500",
                    item.is_optional && "bg-slate-50/50 dark:bg-slate-900/20 border-r-2 border-r-slate-300"
                  )}
                >
                    <TableCell className="text-center font-medium text-green-700">
                      {entrepreneurItems.length + index + 1}
                    </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Icon based on type */}
                      <Tooltip>
                        <TooltipTrigger>
                          {item.is_optional ? (
                            <Info className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Shield className="h-3.5 w-3.5 text-amber-600" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.is_optional ? 'פריט אופציונלי' : 'פריט חובה'}
                        </TooltipContent>
                      </Tooltip>
                      
                      <Input
                        type="text"
                        value={item.description}
                        onChange={(e) => onUpdateAdditionalItem(index, 'description', e.target.value)}
                        placeholder="תיאור הפריט"
                        className={cn(
                          "flex-1",
                          !item.is_optional && "border-amber-300 focus:ring-amber-400",
                          item.is_optional && "border-slate-300 focus:ring-slate-400"
                        )}
                      />
                      
                      {/* Badge - always show */}
                      <Badge 
                        className={cn(
                          "text-xs shrink-0 whitespace-nowrap",
                          item.is_optional 
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-200 dark:border-amber-700"
                        )}
                      >
                        {item.is_optional ? 'אופציונלי' : 'חובה'}
                      </Badge>
                    </div>
                  </TableCell>
                    <TableCell>
                      <select
                        value={item.unit}
                        onChange={(e) => onUpdateAdditionalItem(index, 'unit', e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {Object.entries(UNIT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => onUpdateAdditionalItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        min={1}
                        className="w-16 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Input
                          type="text"
                          value={item.consultant_unit_price ? formatPrice(item.consultant_unit_price) : ''}
                          onChange={(e) => onUpdateAdditionalItem(index, 'consultant_unit_price', parsePrice(e.target.value))}
                          placeholder="מחיר"
                          className="text-left pr-6"
                          dir="ltr"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₪</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-green-700">
                      {rowTotal > 0 ? `₪${formatPrice(rowTotal)}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleComment(itemId)}
                        className="h-8 w-8"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${itemId}-comment`} className="bg-muted/30">
                      <TableCell colSpan={8} className="p-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            הערות לפריט
                          </label>
                          <Textarea
                            value={item.consultant_comment || ''}
                            onChange={(e) => onUpdateAdditionalItem(index, 'consultant_comment', e.target.value)}
                            placeholder="הוסף הערה או הסבר..."
                            rows={2}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
          <TableFooter>
            {/* Mandatory items total */}
            <TableRow className="bg-amber-50/30 dark:bg-amber-950/20">
              <TableCell colSpan={5} className="text-right font-medium">
                סה"כ פריטי חובה:
              </TableCell>
              <TableCell className="text-center font-bold text-amber-700 dark:text-amber-400">
                ₪{formatPrice(mandatoryTotal)}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
            
            {/* Optional items total (if any) */}
            {optionalTotal > 0 && (
              <TableRow className="bg-slate-50/30 dark:bg-slate-900/20">
                <TableCell colSpan={5} className="text-right font-medium text-slate-600 dark:text-slate-400">
                  סה"כ פריטים אופציונליים:
                </TableCell>
                <TableCell className="text-center font-medium text-slate-600 dark:text-slate-400">
                  ₪{formatPrice(optionalTotal)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            )}
            
            {/* Consultant additional items */}
            {additionalItems.length > 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-right font-medium text-green-700 dark:text-green-400">
                  סה"כ פריטים נוספים (שלך):
                </TableCell>
                <TableCell className="text-center font-bold text-green-700 dark:text-green-400">
                  ₪{formatPrice(additionalTotal)}
                </TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            )}
            
            {/* Grand total */}
            <TableRow className="bg-primary/10 border-t-2 border-primary">
              <TableCell colSpan={5} className="text-right font-bold text-lg">
                סה"כ הצעת מחיר:
              </TableCell>
              <TableCell className="text-center font-bold text-lg text-primary">
                ₪{formatPrice(grandTotal)}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        
        {/* VAT Disclaimer - Enhanced */}
        <p className="text-xs text-muted-foreground text-right mt-2">
          * כל המחירים ללא מע"מ | הצעה תקפה ל-30 יום
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onAddItem(false)}
            className="flex-1 border-dashed border-2 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20"
          >
            <Plus className="h-4 w-4 ml-2" />
            הוסף פריט עיקרי
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onAddItem(true)}
            className="flex-1 border-dashed border-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
          >
            <Plus className="h-4 w-4 ml-2" />
            הוסף פריט אופציונלי
          </Button>
        </div>

        {/* Validation warnings */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2 text-orange-700 font-medium">
              <AlertCircle className="h-4 w-4" />
              שימו לב:
            </div>
            {Object.entries(errors).map(([key, message]) => (
              <p key={key} className="text-sm text-orange-600 pr-6">{message}</p>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ConsultantFeeTable;
