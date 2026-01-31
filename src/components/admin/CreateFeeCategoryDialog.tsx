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
import { Switch } from "@/components/ui/switch";
import type { CreateFeeCategoryInput } from "@/types/feeTemplateHierarchy";

interface CreateFeeCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorSpecialty: string;
  projectType: string;
  onSubmit: (data: CreateFeeCategoryInput) => void;
  isLoading?: boolean;
}

export function CreateFeeCategoryDialog({
  open,
  onOpenChange,
  advisorSpecialty,
  projectType,
  onSubmit,
  isLoading,
}: CreateFeeCategoryDialogProps) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      advisor_specialty: advisorSpecialty,
      project_type: projectType,
      is_default: isDefault,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setIsDefault(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>הוספת קטגוריה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם הקטגוריה</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: רישוי, הכנת תב״ע"
              required
            />
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
            קטגוריה זו תשויך ל{advisorSpecialty} בפרויקטים מסוג {projectType}
          </p>

          <DialogFooter className="flex-row-reverse gap-2 pt-4">
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "יוצר..." : "צור קטגוריה"}
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
