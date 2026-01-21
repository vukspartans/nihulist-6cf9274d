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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateLicensingPhase, type LicensingPhase } from "@/hooks/useLicensingPhases";
import { type Municipality } from "@/hooks/useMunicipalities";
import { PROJECT_TYPE_OPTIONS } from "@/constants/project";

interface EditLicensingPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: LicensingPhase | null;
  municipalities: Municipality[];
}

export function EditLicensingPhaseDialog({
  open,
  onOpenChange,
  phase,
  municipalities,
}: EditLicensingPhaseDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [municipalityId, setMunicipalityId] = useState<string>("general");
  const [projectType, setProjectType] = useState<string>("general");
  const [defaultDurationDays, setDefaultDurationDays] = useState<string>("");
  const [displayOrder, setDisplayOrder] = useState<string>("0");

  const updatePhase = useUpdateLicensingPhase();

  useEffect(() => {
    if (phase) {
      setName(phase.name);
      setDescription(phase.description || "");
      setMunicipalityId(phase.municipality_id || "general");
      setProjectType(phase.project_type || "general");
      setDefaultDurationDays(phase.default_duration_days?.toString() || "");
      setDisplayOrder(phase.display_order?.toString() || "0");
    }
  }, [phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phase || !name.trim()) return;

    await updatePhase.mutateAsync({
      id: phase.id,
      name: name.trim(),
      description: description.trim() || undefined,
      municipality_id: municipalityId === "general" ? null : municipalityId,
      project_type: projectType === "general" ? null : projectType,
      default_duration_days: defaultDurationDays ? parseInt(defaultDurationDays) : undefined,
      display_order: parseInt(displayOrder) || 0,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת שלב רישוי</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-phase-name">שם השלב *</Label>
            <Input
              id="edit-phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: הגשת בקשה להיתר"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phase-description">תיאור</Label>
            <Textarea
              id="edit-phase-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור השלב..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>עירייה</Label>
              <Select value={municipalityId} onValueChange={setMunicipalityId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר עירייה" />
                </SelectTrigger>
                <SelectContent>
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
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">כללי (לכל הסוגים)</SelectItem>
                  {PROJECT_TYPE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phase-duration">משך ברירת מחדל (ימים)</Label>
              <Input
                id="edit-phase-duration"
                type="number"
                min="1"
                value={defaultDurationDays}
                onChange={(e) => setDefaultDurationDays(e.target.value)}
                placeholder="14"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phase-order">סדר תצוגה</Label>
              <Input
                id="edit-phase-order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={updatePhase.isPending || !name.trim()}>
              {updatePhase.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
