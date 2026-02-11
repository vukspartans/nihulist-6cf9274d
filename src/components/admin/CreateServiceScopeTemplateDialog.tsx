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
import { useCreateServiceScopeTemplate } from "@/hooks/useRFPTemplatesAdmin";

interface CreateServiceScopeTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAdvisorSpecialty?: string;
  defaultCategoryId?: string;
  defaultProjectType?: string;
  defaultHeader?: string;
  availableHeaders?: string[];
}

export function CreateServiceScopeTemplateDialog({
  open,
  onOpenChange,
  defaultAdvisorSpecialty,
  defaultCategoryId,
  defaultProjectType,
  defaultHeader,
  availableHeaders,
}: CreateServiceScopeTemplateDialogProps) {
  const [taskName, setTaskName] = useState("");
  const [feeCategory, setFeeCategory] = useState(defaultHeader || "כללי");
  const [customCategory, setCustomCategory] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [isOptional, setIsOptional] = useState(false);

  const createMutation = useCreateServiceScopeTemplate();

  useEffect(() => {
    if (defaultHeader) {
      setFeeCategory(defaultHeader);
      setUseCustom(false);
    }
  }, [defaultHeader]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = useCustom ? customCategory.trim() : feeCategory;
    if (!defaultAdvisorSpecialty || !taskName.trim() || !finalCategory) {
      return;
    }

    await createMutation.mutateAsync({
      advisor_specialty: defaultAdvisorSpecialty,
      task_name: taskName.trim(),
      default_fee_category: finalCategory,
      is_optional: isOptional,
      category_id: defaultCategoryId,
      project_type: defaultProjectType,
    });

    // Reset form
    setTaskName("");
    setFeeCategory("כללי");
    setCustomCategory("");
    setUseCustom(false);
    setIsOptional(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setTaskName("");
    setFeeCategory(defaultHeader || "כללי");
    setCustomCategory("");
    setUseCustom(false);
    setIsOptional(false);
  };

  const headers = availableHeaders && availableHeaders.length > 0 ? availableHeaders : [];

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
          {defaultHeader && (
            <div className="space-y-2">
              <Label>כותרת</Label>
              <Input value={defaultHeader} readOnly className="text-right bg-muted" />
            </div>
          )}

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

          {!defaultHeader && (
            <div className="space-y-2">
              <Label htmlFor="fee_category">כותרת (קטגוריה)</Label>
              {!useCustom && headers.length > 0 ? (
                <Select dir="rtl" value={feeCategory} onValueChange={(val) => {
                  if (val === '__custom__') {
                    setUseCustom(true);
                  } else {
                    setFeeCategory(val);
                  }
                }}>
                  <SelectTrigger dir="rtl" className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {headers.map((category) => (
                      <SelectItem key={category} value={category} className="text-right">
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="text-right text-primary">
                      אחר...
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="הזן שם כותרת חדשה"
                    className="text-right flex-1"
                  />
                  {headers.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUseCustom(false);
                        setCustomCategory("");
                      }}
                    >
                      חזרה
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

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
              disabled={createMutation.isPending || !taskName.trim() || (useCustom && !customCategory.trim())}
            >
              {createMutation.isPending ? "יוצר..." : "צור שירות"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
