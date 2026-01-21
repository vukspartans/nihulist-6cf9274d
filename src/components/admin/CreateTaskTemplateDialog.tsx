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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTaskTemplate } from "@/hooks/useTaskTemplatesAdmin";
import { useLicensingPhases } from "@/hooks/useLicensingPhases";
import { type Municipality } from "@/hooks/useMunicipalities";
import { PROJECT_TYPE_OPTIONS } from "@/constants/project";
import { EXPERTISE_OPTIONS } from "@/constants/advisor";

interface CreateTaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  municipalities: Municipality[];
}

export function CreateTaskTemplateDialog({
  open,
  onOpenChange,
  municipalities,
}: CreateTaskTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [municipalityId, setMunicipalityId] = useState<string>("general");
  const [projectType, setProjectType] = useState<string>("general");
  const [phaseId, setPhaseId] = useState<string>("none");
  const [defaultDurationDays, setDefaultDurationDays] = useState<string>("");
  const [advisorSpecialty, setAdvisorSpecialty] = useState<string>("none");
  const [isMilestone, setIsMilestone] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<string>("0");

  const createTemplate = useCreateTaskTemplate();
  const { data: phases } = useLicensingPhases({
    municipalityId: municipalityId === "general" ? undefined : municipalityId,
    projectType: projectType === "general" ? undefined : projectType,
    includeInactive: false,
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setMunicipalityId("general");
    setProjectType("general");
    setPhaseId("none");
    setDefaultDurationDays("");
    setAdvisorSpecialty("none");
    setIsMilestone(false);
    setIsDefault(false);
    setDisplayOrder("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    await createTemplate.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      municipality_id: municipalityId === "general" ? null : municipalityId,
      project_type: projectType === "general" ? null : projectType,
      licensing_phase_id: phaseId === "none" ? null : phaseId,
      default_duration_days: defaultDurationDays ? parseInt(defaultDurationDays) : undefined,
      advisor_specialty: advisorSpecialty === "none" ? undefined : advisorSpecialty,
      is_milestone: isMilestone,
      is_default: isDefault,
      display_order: parseInt(displayOrder) || 0,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת תבנית משימה חדשה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">שם המשימה *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: הכנת תוכניות אדריכליות"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">תיאור</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור המשימה..."
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
                <SelectContent dir="rtl">
                  <SelectItem value="general">כללי</SelectItem>
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
                <SelectContent dir="rtl">
                  <SelectItem value="general">כללי</SelectItem>
                  {PROJECT_TYPE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>שלב רישוי</Label>
            <Select value={phaseId} onValueChange={setPhaseId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר שלב" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="none">ללא שיוך לשלב</SelectItem>
                {phases?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-duration">משך ברירת מחדל (ימים)</Label>
              <Input
                id="template-duration"
                type="number"
                min="1"
                value={defaultDurationDays}
                onChange={(e) => setDefaultDurationDays(e.target.value)}
                placeholder="7"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-order">סדר תצוגה</Label>
              <Input
                id="template-order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>התמחות יועץ</Label>
            <Select value={advisorSpecialty} onValueChange={setAdvisorSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="בחר התמחות" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="none">ללא שיוך</SelectItem>
                {EXPERTISE_OPTIONS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="template-milestone"
                checked={isMilestone}
                onCheckedChange={(checked) => setIsMilestone(!!checked)}
              />
              <Label htmlFor="template-milestone" className="cursor-pointer">
                אבן דרך
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="template-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(!!checked)}
              />
              <Label htmlFor="template-default" className="cursor-pointer">
                תבנית ברירת מחדל
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="submit" disabled={createTemplate.isPending || !name.trim()}>
              {createTemplate.isPending ? "יוצר..." : "צור תבנית"}
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
