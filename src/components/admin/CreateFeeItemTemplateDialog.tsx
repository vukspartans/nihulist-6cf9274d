import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FEE_UNITS, CHARGE_TYPES } from "@/constants/rfpUnits";
import { useCreateFeeItemTemplate } from "@/hooks/useRFPTemplatesAdmin";

interface CreateFeeItemTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAdvisorSpecialty?: string;
  defaultProjectType?: string;
}

export function CreateFeeItemTemplateDialog({
  open,
  onOpenChange,
  defaultAdvisorSpecialty,
  defaultProjectType,
}: CreateFeeItemTemplateDialogProps) {
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("lump_sum");
  const [defaultQuantity, setDefaultQuantity] = useState<number>(1);
  const [chargeType, setChargeType] = useState("one_time");
  const [isOptional, setIsOptional] = useState(false);

  const createMutation = useCreateFeeItemTemplate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!defaultAdvisorSpecialty || !description.trim()) {
      return;
    }

    await createMutation.mutateAsync({
      advisor_specialty: defaultAdvisorSpecialty,
      description: description.trim(),
      unit,
      default_quantity: defaultQuantity,
      charge_type: chargeType,
      is_optional: isOptional,
      project_type: defaultProjectType,
    });

    // Reset form
    setDescription("");
    setUnit("lump_sum");
    setDefaultQuantity(1);
    setChargeType("one_time");
    setIsOptional(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setDescription("");
    setUnit("lump_sum");
    setDefaultQuantity(1);
    setChargeType("one_time");
    setIsOptional(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת פריט שכר טרחה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">תיאור הפריט *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="לדוגמה: הכנת תכנית אדריכלית"
              className="text-right"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">יחידת מדידה</Label>
              <Select dir="rtl" value={unit} onValueChange={setUnit}>
                <SelectTrigger dir="rtl" className="text-right">
                  <SelectValue />
                </SelectTrigger>
              <SelectContent dir="rtl">
                {FEE_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value} className="text-right">
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">כמות ברירת מחדל</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                step={0.1}
                value={defaultQuantity}
                onChange={(e) => setDefaultQuantity(parseFloat(e.target.value) || 1)}
                className="text-right"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="charge_type">סוג חיוב</Label>
            <Select dir="rtl" value={chargeType} onValueChange={setChargeType}>
              <SelectTrigger dir="rtl" className="text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {CHARGE_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value} className="text-right">
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_optional">סמן כאופציונלי</Label>
            <Switch
              id="is_optional"
              checked={isOptional}
              onCheckedChange={setIsOptional}
            />
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !description.trim()}
            >
              {createMutation.isPending ? "יוצר..." : "צור פריט"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
