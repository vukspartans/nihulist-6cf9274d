import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { LoadTemplateButton } from './LoadTemplateButton';
import { RFPFeeItem, FeeUnit, ChargeType } from '@/types/rfpRequest';
import { 
  FEE_UNITS, 
  CHARGE_TYPES, 
  isRecurringChargeType, 
  getDurationUnitLabel,
  DEFAULT_DURATIONS,
  CHARGE_TYPE_TO_DURATION_UNIT
} from '@/constants/rfpUnits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeeItemsTableProps {
  items: RFPFeeItem[];
  optionalItems: RFPFeeItem[];
  onItemsChange: (items: RFPFeeItem[]) => void;
  onOptionalItemsChange: (items: RFPFeeItem[]) => void;
  advisorType?: string;
  feeCategoriesFromItems?: string[];
}

export const FeeItemsTable = ({
  items,
  optionalItems,
  onItemsChange,
  onOptionalItemsChange,
  advisorType,
  feeCategoriesFromItems = []
}: FeeItemsTableProps) => {
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
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
      display_order: targetItems.length,
      duration: undefined,
      duration_unit: undefined
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
    const currentItem = newItems[index];
    
    // Handle charge_type changes - auto-set duration fields
    if (field === 'charge_type') {
      const chargeType = value as ChargeType;
      if (isRecurringChargeType(chargeType)) {
        // Set default duration when switching to recurring
        newItems[index] = { 
          ...currentItem, 
          [field]: value,
          duration: DEFAULT_DURATIONS[chargeType] || 1,
          duration_unit: (CHARGE_TYPE_TO_DURATION_UNIT[chargeType] as any) || undefined
        };
      } else {
        // Clear duration when switching to one-time
        newItems[index] = { 
          ...currentItem, 
          [field]: value,
          duration: undefined,
          duration_unit: undefined
        };
      }
    } else {
      newItems[index] = { ...currentItem, [field]: value };
    }
    
    setItems(newItems);
  };

  const loadTemplates = async () => {
    if (!advisorType) {
      toast.error('לא נבחר סוג יועץ');
      return;
    }

    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('default_fee_item_templates')
        .select('*')
        .eq('advisor_specialty', advisorType)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('לא נמצאו תבניות עבור סוג יועץ זה');
        return;
      }

      // Separate into required and optional items
      const requiredItems: RFPFeeItem[] = [];
      const optionalTemplateItems: RFPFeeItem[] = [];

      data.forEach((template, index) => {
        const feeItem: RFPFeeItem = {
          item_number: index + 1,
          description: template.description,
          unit: template.unit as FeeUnit,
          quantity: Number(template.default_quantity) || 1,
          unit_price: undefined, // Entrepreneur doesn't set prices
          charge_type: template.charge_type as ChargeType,
          is_optional: template.is_optional || false,
          display_order: template.display_order
        };

        if (template.is_optional) {
          optionalTemplateItems.push(feeItem);
        } else {
          requiredItems.push(feeItem);
        }
      });

      // Renumber items
      requiredItems.forEach((item, idx) => {
        item.item_number = idx + 1;
        item.display_order = idx;
      });
      optionalTemplateItems.forEach((item, idx) => {
        item.item_number = idx + 1;
        item.display_order = idx;
      });

      onItemsChange(requiredItems);
      onOptionalItemsChange(optionalTemplateItems);
      
      toast.success(`נטענו ${data.length} פריטי תבנית`);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('שגיאה בטעינת תבניות');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const renderTable = (tableItems: RFPFeeItem[], isOptional: boolean, title: string) => (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between flex-col-reverse sm:flex-row-reverse gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem(isOptional)}
            className="flex items-center gap-2 flex-row-reverse flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            הוסף שורה
          </Button>
          {!isOptional && advisorType && (
            <LoadTemplateButton
              onClick={loadTemplates}
              loading={loadingTemplates}
            />
          )}
        </div>
        <Label className="text-base font-semibold text-right">{title}</Label>
      </div>
      
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {tableItems.map((item, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-3 bg-card">
            {/* Row 1: Item number & Delete */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                סעיף {item.item_number}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index, isOptional)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Row 2: Description (full width) */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">תיאור</Label>
              <Input
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value, isOptional)}
                placeholder="תיאור השירות"
                className="text-right"
                dir="rtl"
              />
            </div>
            
            {/* Row 3: Unit & Quantity (side by side) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">יחידה</Label>
                <Select
                  dir="rtl"
                  value={item.unit}
                  onValueChange={(value) => updateItem(index, 'unit', value as FeeUnit, isOptional)}
                >
                  <SelectTrigger dir="rtl" className="w-full text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {FEE_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value} className="text-right">
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">כמות</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value) || 1, isOptional)}
                  className="text-center"
                />
              </div>
            </div>
            
            {/* Row 4: Charge Type */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">סוג החיוב</Label>
              <Select
                dir="rtl"
                value={item.charge_type}
                onValueChange={(value) => updateItem(index, 'charge_type', value as ChargeType, isOptional)}
              >
                <SelectTrigger dir="rtl" className="w-full text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {CHARGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-right">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Row 5: Duration (only for recurring) */}
            {isRecurringChargeType(item.charge_type) && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">משך (תקופות)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.duration || ''}
                    onChange={(e) => updateItem(index, 'duration', Number(e.target.value) || 1, isOptional)}
                    placeholder="12"
                    className="flex-1 text-center"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {getDurationUnitLabel(item.charge_type)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {tableItems.length === 0 && (
          <div className="border rounded-lg p-4 text-center text-muted-foreground">
            {advisorType ? 'לחץ על "טען תבנית" או "הוסף שורה"' : 'לחץ על "הוסף שורה" להוספת פריט שכ"ט'}
          </div>
        )}
      </div>

      {/* Desktop Table - added duration column */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">סעיף</TableHead>
              <TableHead className="min-w-[200px] text-right">תיאור</TableHead>
              <TableHead className="w-24 text-right">יחידה</TableHead>
              <TableHead className="w-20 text-center">כמות</TableHead>
              <TableHead className="w-28 text-right">סוג החיוב</TableHead>
              <TableHead className="w-24 text-right">משך</TableHead>
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
                    dir="rtl"
                    value={item.unit}
                    onValueChange={(value) => updateItem(index, 'unit', value as FeeUnit, isOptional)}
                  >
                    <SelectTrigger dir="rtl" className="w-full text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {FEE_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value} className="text-right">
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
                  <Select
                    dir="rtl"
                    value={item.charge_type}
                    onValueChange={(value) => updateItem(index, 'charge_type', value as ChargeType, isOptional)}
                  >
                    <SelectTrigger dir="rtl" className="w-full text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {CHARGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-right">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                {/* Duration column */}
                <TableCell>
                  {isRecurringChargeType(item.charge_type) ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="1"
                        value={item.duration || ''}
                        onChange={(e) => updateItem(index, 'duration', Number(e.target.value) || 1, isOptional)}
                        className="w-14 text-center"
                        placeholder="12"
                      />
                      <span className="text-xs text-muted-foreground">
                        {getDurationUnitLabel(item.charge_type)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
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
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  {advisorType ? 'לחץ על "טען תבנית" או "הוסף שורה"' : 'לחץ על "הוסף שורה" להוספת פריט שכ"ט'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8" dir="rtl">
      {renderTable(items, false, 'שכר טרחה')}
      
      <div className="border-t pt-6">
        {renderTable(optionalItems, true, 'סעיפים אופציונליים')}
      </div>
    </div>
  );
};
