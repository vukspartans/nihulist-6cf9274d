import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { METHOD_TYPE_LABELS, METHOD_TYPES } from "@/types/feeTemplateHierarchy";
import type { CreateSubmissionMethodInput } from "@/types/feeTemplateHierarchy";

interface CreateSubmissionMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  onSubmit: (data: CreateSubmissionMethodInput) => void;
  isLoading?: boolean;
}

export function CreateSubmissionMethodDialog({
  open,
  onOpenChange,
  categoryId,
  onSubmit,
  isLoading,
}: CreateSubmissionMethodDialogProps) {
  const [methodType, setMethodType] = useState<'lump_sum' | 'quantity' | 'hourly'>('lump_sum');
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      category_id: categoryId,
      method_type: methodType,
      method_label: METHOD_TYPE_LABELS[methodType],
      is_default: isDefault,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMethodType('lump_sum');
      setIsDefault(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>הוספת שיטת הגשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="method-type">סוג שיטת הגשה</Label>
            <Select
              dir="rtl"
              value={methodType}
              onValueChange={(value) => setMethodType(value as typeof methodType)}
            >
              <SelectTrigger id="method-type" className="text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHOD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {METHOD_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-default">הגדר כברירת מחדל</Label>
            <Switch
              id="is-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            שיטת הגשה זו תאפשר הזנת הצעות מחיר בפורמט {METHOD_TYPE_LABELS[methodType]}
          </p>

          <DialogFooter className="flex-row-reverse gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "יוצר..." : "צור שיטת הגשה"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
