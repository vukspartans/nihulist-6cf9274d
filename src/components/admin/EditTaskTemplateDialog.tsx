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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateTaskTemplate, type TaskTemplate } from "@/hooks/useTaskTemplatesAdmin";
import { useLicensingPhases } from "@/hooks/useLicensingPhases";
import { type Municipality } from "@/hooks/useMunicipalities";
import { PROJECT_TYPE_OPTIONS } from "@/constants/project";
import { EXPERTISE_OPTIONS } from "@/constants/advisor";

interface EditTaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TaskTemplate | null;
  municipalities: Municipality[];
}

export function EditTaskTemplateDialog({
  open,
  onOpenChange,
  template,
  municipalities,
}: EditTaskTemplateDialogProps) {
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

  const updateTemplate = useUpdateTaskTemplate();
  const { data: phases } = useLicensingPhases({
    municipalityId: municipalityId === "general" ? undefined : municipalityId,
    projectType: projectType === "general" ? undefined : projectType,
    includeInactive: false,
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setMunicipalityId(template.municipality_id || "general");
      setProjectType(template.project_type || "general");
      setPhaseId(template.licensing_phase_id || "none");
      setDefaultDurationDays(template.default_duration_days?.toString() || "");
      setAdvisorSpecialty(template.advisor_specialty || "none");
      setIsMilestone(template.is_milestone);
      setIsDefault(template.is_default);
      setDisplayOrder(template.display_order?.toString() || "0");
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!template || !name.trim()) return;

    await updateTemplate.mutateAsync({
      id: template.id,
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

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת תבנית משימה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-template-name">שם המשימה *</Label>
            <Input
              id="edit-template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: הכנת תוכניות אדריכליות"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-template-description">תיאור</Label>
            <Textarea
              id="edit-template-description"
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
                <SelectContent>
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
                <SelectContent>
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
              <SelectContent>
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
              <Label htmlFor="edit-template-duration">משך ברירת מחדל (ימים)</Label>
              <Input
                id="edit-template-duration"
                type="number"
                min="1"
                value={defaultDurationDays}
                onChange={(e) => setDefaultDurationDays(e.target.value)}
                placeholder="7"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-template-order">סדר תצוגה</Label>
              <Input
                id="edit-template-order"
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
              <SelectContent>
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
                id="edit-template-milestone"
                checked={isMilestone}
                onCheckedChange={(checked) => setIsMilestone(!!checked)}
              />
              <Label htmlFor="edit-template-milestone" className="cursor-pointer">
                אבן דרך
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-template-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(!!checked)}
              />
              <Label htmlFor="edit-template-default" className="cursor-pointer">
                תבנית ברירת מחדל
              </Label>
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
            <Button type="submit" disabled={updateTemplate.isPending || !name.trim()}>
              {updateTemplate.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
