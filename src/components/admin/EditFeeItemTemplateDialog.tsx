import { useState, useEffect } from "react";
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
import { ADVISOR_EXPERTISE } from "@/constants/advisor";
import { FEE_UNITS, CHARGE_TYPES } from "@/constants/rfpUnits";
import { useUpdateFeeItemTemplate, FeeItemTemplate } from "@/hooks/useRFPTemplatesAdmin";

interface EditFeeItemTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FeeItemTemplate | null;
}

export function EditFeeItemTemplateDialog({
  open,
  onOpenChange,
  template,
}: EditFeeItemTemplateDialogProps) {
  const [advisorSpecialty, setAdvisorSpecialty] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("lump_sum");
  const [defaultQuantity, setDefaultQuantity] = useState<number>(1);
  const [chargeType, setChargeType] = useState("one_time");
  const [isOptional, setIsOptional] = useState(false);

  const updateMutation = useUpdateFeeItemTemplate();

  useEffect(() => {
    if (template) {
      setAdvisorSpecialty(template.advisor_specialty);
      setDescription(template.description);
      setUnit(template.unit);
      setDefaultQuantity(template.default_quantity ?? 1);
      setChargeType(template.charge_type || "one_time");
      setIsOptional(template.is_optional);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!template || !advisorSpecialty || !description.trim()) {
      return;
    }

    await updateMutation.mutateAsync({
      id: template.id,
      advisor_specialty: advisorSpecialty,
      description: description.trim(),
      unit,
      default_quantity: defaultQuantity,
      charge_type: chargeType,
      is_optional: isOptional,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת פריט שכר טרחה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="advisor_specialty">סוג יועץ *</Label>
            <Select dir="rtl" value={advisorSpecialty} onValueChange={setAdvisorSpecialty}>
              <SelectTrigger dir="rtl" className="text-right">
                <SelectValue placeholder="בחר סוג יועץ" />
              </SelectTrigger>
              <SelectContent>
                {ADVISOR_EXPERTISE.map((expertise) => (
                  <SelectItem key={expertise} value={expertise}>
                    {expertise}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                <SelectContent>
                  {FEE_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="charge_type">סוג חיוב</Label>
            <Select dir="rtl" value={chargeType} onValueChange={setChargeType}>
              <SelectTrigger dir="rtl" className="text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
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

          <DialogFooter>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !advisorSpecialty || !description.trim()}
            >
              {updateMutation.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
