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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateLicensingPhase } from "@/hooks/useLicensingPhases";
import { type Municipality } from "@/hooks/useMunicipalities";
import { PROJECT_CATEGORIES, getProjectTypesByCategory } from "@/constants/project";

interface CreateLicensingPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  municipalities: Municipality[];
}

export function CreateLicensingPhaseDialog({
  open,
  onOpenChange,
  municipalities,
}: CreateLicensingPhaseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [municipalityId, setMunicipalityId] = useState<string>("general");
  const [projectType, setProjectType] = useState<string>("general");
  const [defaultDurationDays, setDefaultDurationDays] = useState<string>("");
  const [displayOrder, setDisplayOrder] = useState<string>("0");

  const createPhase = useCreateLicensingPhase();

  const resetForm = () => {
    setName("");
    setDescription("");
    setMunicipalityId("general");
    setProjectType("general");
    setDefaultDurationDays("");
    setDisplayOrder("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    await createPhase.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      municipality_id: municipalityId === "general" ? null : municipalityId,
      project_type: projectType === "general" ? null : projectType,
      default_duration_days: defaultDurationDays ? parseInt(defaultDurationDays) : undefined,
      display_order: parseInt(displayOrder) || 0,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוספת שלב רישוי חדש</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phase-name">שם השלב *</Label>
            <Input
              id="phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: הגשת בקשה להיתר"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phase-description">תיאור</Label>
            <Textarea
              id="phase-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור השלב..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>עירייה</Label>
              <Select dir="rtl" value={municipalityId} onValueChange={setMunicipalityId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר עירייה" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="general">כללי (לכל העיריות)</SelectItem>
                  {municipalities.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>סוג פרויקט</Label>
              <Select dir="rtl" value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג" />
                </SelectTrigger>
                <SelectContent dir="rtl" className="max-h-80">
                  <SelectItem value="general">כללי (לכל הסוגים)</SelectItem>
                  {PROJECT_CATEGORIES.map((category) => (
                    <SelectGroup key={category}>
                      <SelectLabel className="text-right font-bold text-primary">
                        {category}
                      </SelectLabel>
                      {getProjectTypesByCategory(category).map((type) => (
                        <SelectItem key={type} value={type} className="pr-6">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phase-duration">משך ברירת מחדל (ימים)</Label>
              <Input
                id="phase-duration"
                type="number"
                min="1"
                value={defaultDurationDays}
                onChange={(e) => setDefaultDurationDays(e.target.value)}
                placeholder="14"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase-order">סדר תצוגה</Label>
              <Input
                id="phase-order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="submit" disabled={createPhase.isPending || !name.trim()}>
              {createPhase.isPending ? "יוצר..." : "צור שלב"}
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
