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
import { useUpdateServiceScopeTemplate, ServiceScopeTemplate } from "@/hooks/useRFPTemplatesAdmin";

interface EditServiceScopeTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ServiceScopeTemplate | null;
  availableHeaders?: string[];
}

export function EditServiceScopeTemplateDialog({
  open,
  onOpenChange,
  template,
  availableHeaders,
}: EditServiceScopeTemplateDialogProps) {
  const [taskName, setTaskName] = useState("");
  const [feeCategory, setFeeCategory] = useState("כללי");
  const [customCategory, setCustomCategory] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [isOptional, setIsOptional] = useState(false);

  const updateMutation = useUpdateServiceScopeTemplate();

  useEffect(() => {
    if (template) {
      setTaskName(template.task_name);
      const cat = template.default_fee_category || "כללי";
      const headers = availableHeaders || [];
      if (headers.includes(cat)) {
        setFeeCategory(cat);
        setUseCustom(false);
      } else {
        setCustomCategory(cat);
        setUseCustom(true);
      }
      setIsOptional(template.is_optional);
    }
  }, [template, availableHeaders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = useCustom ? customCategory.trim() : feeCategory;
    if (!template || !taskName.trim() || !finalCategory) {
      return;
    }

    await updateMutation.mutateAsync({
      id: template.id,
      task_name: taskName.trim(),
      default_fee_category: finalCategory,
      is_optional: isOptional,
    });

    onOpenChange(false);
  };

  const headers = availableHeaders && availableHeaders.length > 0 ? availableHeaders : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת שירות</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={updateMutation.isPending || !taskName.trim() || (useCustom && !customCategory.trim())}
            >
              {updateMutation.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
