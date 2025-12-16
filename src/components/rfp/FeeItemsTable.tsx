import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { RFPFeeItem, FeeUnit, ChargeType } from '@/types/rfpRequest';
import { FEE_UNITS, CHARGE_TYPES } from '@/constants/rfpUnits';

interface FeeItemsTableProps {
  items: RFPFeeItem[];
  optionalItems: RFPFeeItem[];
  onItemsChange: (items: RFPFeeItem[]) => void;
  onOptionalItemsChange: (items: RFPFeeItem[]) => void;
  feeCategoriesFromItems?: string[];
}

export const FeeItemsTable = ({
  items,
  optionalItems,
  onItemsChange,
  onOptionalItemsChange,
  feeCategoriesFromItems = []
}: FeeItemsTableProps) => {
  
  const addItem = (isOptional: boolean) => {
    const targetItems = isOptional ? optionalItems : items;
    const setItems = isOptional ? onOptionalItemsChange : onItemsChange;
    
    const newItem: RFPFeeItem = {
      item_number: targetItems.length + 1,
      description: '',
      unit: 'lump_sum',
      quantity: 1,
      unit_price: undefined,
      charge_type: 'one_time',
      is_optional: isOptional,
      display_order: targetItems.length
    };
    
    setItems([...targetItems, newItem]);
  };

  const removeItem = (index: number, isOptional: boolean) => {
    const targetItems = isOptional ? optionalItems : items;
    const setItems = isOptional ? onOptionalItemsChange : onItemsChange;
    
    const newItems = targetItems.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      item_number: i + 1,
      display_order: i
    }));
    
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof RFPFeeItem, value: any, isOptional: boolean) => {
    const targetItems = isOptional ? optionalItems : items;
    const setItems = isOptional ? onOptionalItemsChange : onItemsChange;
    
    const newItems = [...targetItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = (itemsList: RFPFeeItem[]): number => {
    return itemsList.reduce((sum, item) => {
      const price = item.unit_price || 0;
      const qty = item.quantity || 1;
      return sum + (price * qty);
    }, 0);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderTable = (tableItems: RFPFeeItem[], isOptional: boolean, title: string) => (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between flex-row-reverse">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addItem(isOptional)}
          className="flex items-center gap-2 flex-row-reverse"
        >
          <Plus className="h-4 w-4" />
          הוסף שורה
        </Button>
        <Label className="text-base font-semibold text-right">{title}</Label>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">סעיף</TableHead>
              <TableHead className="min-w-[200px] text-right">תיאור</TableHead>
              <TableHead className="w-24 text-right">יחידה</TableHead>
              <TableHead className="w-20 text-center">כמות</TableHead>
              <TableHead className="w-28 text-right">מחיר יחידה</TableHead>
              <TableHead className="w-28 text-right">סוג החיוב</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="text-center font-medium">
                  {item.item_number}
                </TableCell>
                <TableCell>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value, isOptional)}
                    placeholder="תיאור השירות"
                    className="text-right"
                    dir="rtl"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.unit}
                    onValueChange={(value) => updateItem(index, 'unit', value as FeeUnit, isOptional)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value) || 1, isOptional)}
                    className="text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={item.unit_price || ''}
                    onChange={(e) => updateItem(index, 'unit_price', e.target.value ? Number(e.target.value) : undefined, isOptional)}
                    placeholder="₪"
                    className="text-left"
                    dir="ltr"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.charge_type}
                    onValueChange={(value) => updateItem(index, 'charge_type', value as ChargeType, isOptional)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHARGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index, isOptional)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tableItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  לחץ על "הוסף שורה" להוספת פריט שכ"ט
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {tableItems.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-muted px-4 py-2 rounded-lg">
            <span className="text-sm text-muted-foreground ml-2">
              {isOptional ? 'סה"כ אופציונלי:' : 'שכ"ט כולל:'}
            </span>
            <span className="font-bold text-lg">
              {formatCurrency(calculateTotal(tableItems))}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8" dir="rtl">
      {renderTable(items, false, 'שכר טרחה')}
      
      <div className="border-t pt-6">
        {renderTable(optionalItems, true, 'סעיפים אופציונליים')}
      </div>
      
      {(items.length > 0 || optionalItems.length > 0) && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between flex-row-reverse">
            <span className="text-xl font-bold text-primary">
              {formatCurrency(calculateTotal(items))}
            </span>
            <span className="font-semibold text-right">סה"כ שכ"ט (ללא אופציונלי):</span>
          </div>
        </div>
      )}
    </div>
  );
};
