import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Lock, AlertCircle, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentTerms, MilestonePayment } from '@/types/rfpRequest';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ConsultantMilestone {
  id: string;
  description: string;
  entrepreneur_percentage: number | null; // null for consultant-added
  consultant_percentage: number;
  trigger?: string;
  is_entrepreneur_defined: boolean;
}

export type PaymentTermType = 
  | 'immediate' | 'current' | 'net_15' | 'net_30' 
  | 'net_45' | 'net_60' | 'net_75' | 'net_90' | 'net_120';

interface ConsultantPaymentTermsProps {
  entrepreneurTerms: PaymentTerms | null;
  consultantMilestones: ConsultantMilestone[];
  onMilestonesChange: (milestones: ConsultantMilestone[]) => void;
  paymentTermType?: PaymentTermType;
  onPaymentTermTypeChange?: (type: PaymentTermType) => void;
  paymentTermsComment?: string;
  onPaymentTermsCommentChange?: (comment: string) => void;
}

export function ConsultantPaymentTerms({
  entrepreneurTerms,
  consultantMilestones,
  onMilestonesChange,
  paymentTermType,
  onPaymentTermTypeChange,
  paymentTermsComment,
  onPaymentTermsCommentChange,
}: ConsultantPaymentTermsProps) {
  // Detect if payment terms differ from entrepreneur's
  const entrepreneurPaymentType = entrepreneurTerms?.payment_term_type;
  const hasPaymentTermsChanged = paymentTermType && entrepreneurPaymentType && paymentTermType !== entrepreneurPaymentType;
  // Calculate total
  const totalPercentage = consultantMilestones.reduce((sum, m) => sum + m.consultant_percentage, 0);
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01;

  const handlePercentageChange = (id: string, value: number) => {
    const updated = consultantMilestones.map(m => 
      m.id === id ? { ...m, consultant_percentage: Math.min(100, Math.max(0, value)) } : m
    );
    onMilestonesChange(updated);
  };

  const handleDescriptionChange = (id: string, value: string) => {
    const updated = consultantMilestones.map(m => 
      m.id === id ? { ...m, description: value } : m
    );
    onMilestonesChange(updated);
  };

  const handleAddMilestone = (afterIndex: number) => {
    const newMilestone: ConsultantMilestone = {
      id: `new-${Date.now()}`,
      description: '',
      entrepreneur_percentage: null,
      consultant_percentage: 0,
      is_entrepreneur_defined: false,
    };
    
    const updated = [
      ...consultantMilestones.slice(0, afterIndex + 1),
      newMilestone,
      ...consultantMilestones.slice(afterIndex + 1),
    ];
    onMilestonesChange(updated);
  };

  const handleRemoveMilestone = (id: string) => {
    const milestone = consultantMilestones.find(m => m.id === id);
    if (milestone?.is_entrepreneur_defined) return; // Can't remove entrepreneur milestones
    
    const updated = consultantMilestones.filter(m => m.id !== id);
    onMilestonesChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...consultantMilestones];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onMilestonesChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === consultantMilestones.length - 1) return;
    const updated = [...consultantMilestones];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onMilestonesChange(updated);
  };

  // Show advance payment if defined
  const advancePercent = entrepreneurTerms?.advance_percent;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Advance Payment */}
        {advancePercent && advancePercent > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">מקדמה (קבוע ע"י היזם)</span>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {advancePercent}%
              </Badge>
            </div>
          </div>
        )}

        {/* Milestones Table */}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[200px]">תיאור אבן הדרך</TableHead>
              <TableHead className="w-28 text-center">% יזם</TableHead>
              <TableHead className="w-32 text-center">% יועץ</TableHead>
              <TableHead className="w-24 text-center">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consultantMilestones.map((milestone, index) => (
              <TableRow 
                key={milestone.id}
                className={cn(
                  milestone.is_entrepreneur_defined 
                    ? "bg-primary/5 border-r-4 border-r-primary/30" 
                    : "bg-green-50/50 dark:bg-green-950/20"
                )}
              >
                <TableCell className="font-medium">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {milestone.is_entrepreneur_defined && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>אבן דרך מוגדרת ע"י היזם</TooltipContent>
                      </Tooltip>
                    )}
                    {milestone.is_entrepreneur_defined ? (
                      <span>{milestone.description}</span>
                    ) : (
                      <Input
                        value={milestone.description}
                        onChange={(e) => handleDescriptionChange(milestone.id, e.target.value)}
                        placeholder="תיאור אבן הדרך"
                        className="border-green-300 focus:ring-green-400"
                      />
                    )}
                    {milestone.trigger && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {milestone.trigger}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {milestone.entrepreneur_percentage !== null ? (
                    <Badge variant="secondary">{milestone.entrepreneur_percentage}%</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="relative">
                    <Input
                      type="number"
                      value={milestone.consultant_percentage}
                      onChange={(e) => handlePercentageChange(milestone.id, parseFloat(e.target.value) || 0)}
                      min={0}
                      max={100}
                      step={0.5}
                      className="text-center pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-7 w-7"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === consultantMilestones.length - 1}
                      className="h-7 w-7"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    {!milestone.is_entrepreneur_defined && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMilestone(milestone.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className={cn(
              "font-bold",
              isValidTotal ? "bg-green-100 dark:bg-green-950/30" : "bg-orange-100 dark:bg-orange-950/30"
            )}>
              <TableCell colSpan={3} className="text-right">
                סה"כ:
              </TableCell>
              <TableCell className={cn(
                "text-center text-lg",
                isValidTotal ? "text-green-700 dark:text-green-400" : "text-orange-700 dark:text-orange-400"
              )}>
                {totalPercentage.toFixed(1)}%
              </TableCell>
              <TableCell>
                {isValidTotal ? (
                  <Badge variant="default" className="bg-green-600">✓</Badge>
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    </TooltipTrigger>
                    <TooltipContent>הסכום חייב להיות 100%</TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        {/* Add Milestone Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => handleAddMilestone(consultantMilestones.length - 1)}
          className="w-full border-dashed border-2 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20"
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף אבן דרך
        </Button>

        {/* Validation Warning */}
        {!isValidTotal && (
          <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              סכום האחוזים חייב להיות 100%. כרגע הסכום הוא {totalPercentage.toFixed(1)}%.
              {totalPercentage > 100 
                ? ` יש להפחית ${(totalPercentage - 100).toFixed(1)}%.`
                : ` יש להוסיף ${(100 - totalPercentage).toFixed(1)}%.`
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Term Type - Editable */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <Label className="font-medium">תנאי תשלום</Label>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select
                value={paymentTermType || entrepreneurPaymentType || 'current'}
                onValueChange={(v) => onPaymentTermTypeChange?.(v as PaymentTermType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תנאי תשלום" />
                </SelectTrigger>
              <SelectContent>
                  <SelectItem value="immediate">תשלום מיידי</SelectItem>
                  <SelectItem value="current">שוטף</SelectItem>
                  <SelectItem value="net_15">שוטף + 15</SelectItem>
                  <SelectItem value="net_30">שוטף + 30</SelectItem>
                  <SelectItem value="net_45">שוטף + 45</SelectItem>
                  <SelectItem value="net_60">שוטף + 60</SelectItem>
                  <SelectItem value="net_75">שוטף + 75</SelectItem>
                  <SelectItem value="net_90">שוטף + 90</SelectItem>
                  <SelectItem value="net_120">שוטף + 120</SelectItem>
                </SelectContent>
              </Select>
              {entrepreneurPaymentType && (
                <p className="text-xs text-muted-foreground mt-1">
                  היזם ביקש: {
                    entrepreneurPaymentType === 'immediate' ? 'תשלום מיידי' :
                    entrepreneurPaymentType === 'current' ? 'שוטף' : 
                    entrepreneurPaymentType === 'net_15' ? 'שוטף + 15' :
                    entrepreneurPaymentType === 'net_30' ? 'שוטף + 30' :
                    entrepreneurPaymentType === 'net_45' ? 'שוטף + 45' :
                    entrepreneurPaymentType === 'net_60' ? 'שוטף + 60' :
                    entrepreneurPaymentType === 'net_75' ? 'שוטף + 75' :
                    entrepreneurPaymentType === 'net_90' ? 'שוטף + 90' :
                    entrepreneurPaymentType === 'net_120' ? 'שוטף + 120' : entrepreneurPaymentType
                  }
                </p>
              )}
            </div>
          </div>
          
          {hasPaymentTermsChanged && (
            <div className="space-y-2 pt-2 border-t border-orange-200 dark:border-orange-800">
              <Label className="text-orange-700 dark:text-orange-400">
                <AlertCircle className="h-4 w-4 inline ml-1" />
                שינית את תנאי התשלום - אנא הסבר מדוע
              </Label>
              <Textarea
                value={paymentTermsComment}
                onChange={(e) => onPaymentTermsCommentChange?.(e.target.value)}
                placeholder="הסבר את הסיבה לשינוי בתנאי התשלום..."
                rows={2}
                className="border-orange-300 focus:ring-orange-400"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        {entrepreneurTerms?.notes && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <span className="font-medium">הערות היזם: </span>
            <span className="text-muted-foreground">{entrepreneurTerms.notes}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default ConsultantPaymentTerms;
