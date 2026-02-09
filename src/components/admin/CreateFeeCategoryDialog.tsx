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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDEX_TYPES, DEFAULT_INDEX_TYPE } from "@/constants/indexTypes";
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
  const [indexType, setIndexType] = useState<string>(DEFAULT_INDEX_TYPE);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      advisor_specialty: advisorSpecialty,
      project_type: projectType,
      is_default: isDefault,
      default_index_type: indexType,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setIsDefault(false);
      setIndexType(DEFAULT_INDEX_TYPE);
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

          <div className="space-y-2">
            <Label htmlFor="index-type">מדד ברירת מחדל</Label>
            <Select dir="rtl" value={indexType} onValueChange={setIndexType}>
              <SelectTrigger id="index-type" className="text-right">
                <SelectValue placeholder="בחר מדד" />
              </SelectTrigger>
              <SelectContent>
                {INDEX_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
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
