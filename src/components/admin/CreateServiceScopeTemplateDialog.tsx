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
import { ADVISOR_EXPERTISE } from "@/constants/advisor";
import { DEFAULT_FEE_CATEGORIES } from "@/constants/rfpUnits";
import { useCreateServiceScopeTemplate } from "@/hooks/useRFPTemplatesAdmin";

interface CreateServiceScopeTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAdvisorSpecialty?: string;
}

export function CreateServiceScopeTemplateDialog({
  open,
  onOpenChange,
  defaultAdvisorSpecialty,
}: CreateServiceScopeTemplateDialogProps) {
  const [advisorSpecialty, setAdvisorSpecialty] = useState(defaultAdvisorSpecialty || "");
  const [taskName, setTaskName] = useState("");
  const [feeCategory, setFeeCategory] = useState("כללי");
  const [isOptional, setIsOptional] = useState(false);

  const createMutation = useCreateServiceScopeTemplate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!advisorSpecialty || !taskName.trim()) {
      return;
    }

    await createMutation.mutateAsync({
      advisor_specialty: advisorSpecialty,
      task_name: taskName.trim(),
      default_fee_category: feeCategory,
      is_optional: isOptional,
    });

    // Reset form
    setTaskName("");
    setFeeCategory("כללי");
    setIsOptional(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setAdvisorSpecialty(defaultAdvisorSpecialty || "");
    setTaskName("");
    setFeeCategory("כללי");
    setIsOptional(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת שירות חדש</DialogTitle>
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
            <Label htmlFor="task_name">שם השירות *</Label>
            <Input
              id="task_name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="לדוגמה: ביקורת באתר"
              className="text-right"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee_category">קטגוריית שכ"ט</Label>
            <Select dir="rtl" value={feeCategory} onValueChange={setFeeCategory}>
              <SelectTrigger dir="rtl" className="text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_FEE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
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
              disabled={createMutation.isPending || !advisorSpecialty || !taskName.trim()}
            >
              {createMutation.isPending ? "יוצר..." : "צור שירות"}
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
