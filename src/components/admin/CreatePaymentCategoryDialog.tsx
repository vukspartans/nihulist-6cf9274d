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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePaymentCategory } from "@/hooks/usePaymentCategories";
import { adminTranslations } from "@/constants/adminTranslations";

interface CreatePaymentCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_COLORS = [
  { value: "#3B82F6", label: "כחול" },
  { value: "#10B981", label: "ירוק" },
  { value: "#F59E0B", label: "כתום" },
  { value: "#EF4444", label: "אדום" },
  { value: "#8B5CF6", label: "סגול" },
  { value: "#EC4899", label: "ורוד" },
  { value: "#6B7280", label: "אפור" },
  { value: "#14B8A6", label: "טורקיז" },
];

export function CreatePaymentCategoryDialog({
  open,
  onOpenChange,
}: CreatePaymentCategoryDialogProps) {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6B7280");
  const [isActive, setIsActive] = useState(true);
  
  const createCategory = useCreatePaymentCategory();
  const t = adminTranslations.payments.categories;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    await createCategory.mutateAsync({
      name: name.trim(),
      name_en: nameEn.trim() || undefined,
      description: description.trim() || undefined,
      color,
      is_active: isActive,
    });
    
    // Reset form
    setName("");
    setNameEn("");
    setDescription("");
    setColor("#6B7280");
    setIsActive(true);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{t.dialog.createTitle}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.dialog.nameLabel}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.dialog.namePlaceholder}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nameEn">{t.dialog.nameEnLabel}</Label>
            <Input
              id="nameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t.dialog.nameEnPlaceholder}
              dir="ltr"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">{t.dialog.descriptionLabel}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.dialog.descriptionPlaceholder}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>{t.dialog.colorLabel}</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {CATEGORY_COLORS.find((c) => c.value === color)?.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: c.value }}
                      />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">{adminTranslations.common.active}</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {adminTranslations.common.cancel}
            </Button>
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending
                ? adminTranslations.common.loading
                : adminTranslations.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
