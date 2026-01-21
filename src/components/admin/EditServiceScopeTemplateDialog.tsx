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
import { DEFAULT_FEE_CATEGORIES } from "@/constants/rfpUnits";
import { useUpdateServiceScopeTemplate, ServiceScopeTemplate } from "@/hooks/useRFPTemplatesAdmin";

interface EditServiceScopeTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ServiceScopeTemplate | null;
}

export function EditServiceScopeTemplateDialog({
  open,
  onOpenChange,
  template,
}: EditServiceScopeTemplateDialogProps) {
  const [advisorSpecialty, setAdvisorSpecialty] = useState("");
  const [taskName, setTaskName] = useState("");
  const [feeCategory, setFeeCategory] = useState("כללי");
  const [isOptional, setIsOptional] = useState(false);

  const updateMutation = useUpdateServiceScopeTemplate();

  useEffect(() => {
    if (template) {
      setAdvisorSpecialty(template.advisor_specialty);
      setTaskName(template.task_name);
      setFeeCategory(template.default_fee_category || "כללי");
      setIsOptional(template.is_optional);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!template || !advisorSpecialty || !taskName.trim()) {
      return;
    }

    await updateMutation.mutateAsync({
      id: template.id,
      advisor_specialty: advisorSpecialty,
      task_name: taskName.trim(),
      default_fee_category: feeCategory,
      is_optional: isOptional,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת שירות</DialogTitle>
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
              disabled={updateMutation.isPending || !advisorSpecialty || !taskName.trim()}
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
