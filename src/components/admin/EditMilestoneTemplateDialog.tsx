import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useUpdateMilestoneTemplate, useMilestoneTemplate } from "@/hooks/useMilestoneTemplates";
import { useMunicipalities } from "@/hooks/useMunicipalities";
import { PROJECT_TYPE_OPTIONS } from "@/constants/project";
import { EXPERTISE_OPTIONS } from "@/constants/advisor";
import { TRIGGER_TYPES, type UpdateMilestoneTemplateInput } from "@/types/milestoneTemplate";
import { adminTranslations } from "@/constants/adminTranslations";
import { MilestoneTaskLinker } from "./MilestoneTaskLinker";

interface EditMilestoneTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestoneId?: string | null;
  template?: { id: string; [key: string]: any } | null;
}

export function EditMilestoneTemplateDialog({
  open,
  onOpenChange,
  milestoneId: propMilestoneId,
  template,
}: EditMilestoneTemplateDialogProps) {
  const milestoneId = propMilestoneId || template?.id || null;
  const t = adminTranslations.payments.milestones;
  const [activeTab, setActiveTab] = useState("basic");

  const updateMilestone = useUpdateMilestoneTemplate();
  const { data: milestone, isLoading } = useMilestoneTemplate(milestoneId || "");
  const { data: municipalities = [] } = useMunicipalities();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdateMilestoneTemplateInput>();

  // Reset form when milestone changes
  useEffect(() => {
    if (milestone) {
      reset({
        id: milestone.id,
        name: milestone.name,
        name_en: milestone.name_en || "",
        description: milestone.description || "",
        project_type: milestone.project_type || "",
        municipality_id: milestone.municipality_id || "",
        advisor_specialty: milestone.advisor_specialty || "",
        percentage_of_total: milestone.percentage_of_total,
        fixed_amount: milestone.fixed_amount || undefined,
        currency: milestone.currency,
        trigger_type: milestone.trigger_type,
        is_active: milestone.is_active,
      });
    }
  }, [milestone, reset]);

  const onSubmit = async (data: UpdateMilestoneTemplateInput) => {
    if (!milestoneId) return;

    const submitData = {
      ...data,
      id: milestoneId,
      project_type: data.project_type || null,
      municipality_id: data.municipality_id || null,
      advisor_specialty: data.advisor_specialty || null,
      fixed_amount: data.fixed_amount || null,
    };

    await updateMilestone.mutateAsync(submitData);
    onOpenChange(false);
  };

  const handleClose = () => {
    setActiveTab("basic");
    onOpenChange(false);
  };

  if (!milestoneId) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t.dialog.editTitle}</DialogTitle>
            {milestone?.is_system && (
              <Badge variant="secondary">מערכת</Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">טוען...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            {milestone?.is_system && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  זוהי אבן דרך מערכת. ניתן לערוך את הפרטים אך לא למחוק.
                </AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">{t.dialog.basicTab}</TabsTrigger>
                <TabsTrigger value="payment">{t.dialog.paymentTab}</TabsTrigger>
                <TabsTrigger value="tasks">{t.dialog.tasksTab}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t.dialog.nameLabel}</Label>
                    <Input
                      id="name"
                      {...register("name", { required: true })}
                      placeholder={t.dialog.namePlaceholder}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">שדה חובה</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name_en">{t.dialog.nameEnLabel}</Label>
                    <Input
                      id="name_en"
                      {...register("name_en")}
                      placeholder="e.g., Building Permit"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t.dialog.descriptionLabel}</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="תיאור אבן הדרך..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t.dialog.projectTypeLabel}</Label>
                    <Select
                      dir="rtl"
                      value={watch("project_type") || ""}
                      onValueChange={(val) => setValue("project_type", val)}
                    >
                      <SelectTrigger dir="rtl" className="text-right">
                        <SelectValue placeholder={t.dialog.projectTypeAll} />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="" className="text-right">{t.dialog.projectTypeAll}</SelectItem>
                        {PROJECT_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-right">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t.dialog.municipalityLabel}</Label>
                    <Select
                      dir="rtl"
                      value={watch("municipality_id") || ""}
                      onValueChange={(val) => setValue("municipality_id", val)}
                    >
                      <SelectTrigger dir="rtl" className="text-right">
                        <SelectValue placeholder={t.dialog.municipalityAll} />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="" className="text-right">{t.dialog.municipalityAll}</SelectItem>
                        {municipalities.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-right">
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t.dialog.advisorSpecialtyLabel}</Label>
                    <Select
                      dir="rtl"
                      value={watch("advisor_specialty") || ""}
                      onValueChange={(val) => setValue("advisor_specialty", val)}
                    >
                      <SelectTrigger dir="rtl" className="text-right">
                        <SelectValue placeholder={t.dialog.advisorSpecialtyAll} />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="" className="text-right">{t.dialog.advisorSpecialtyAll}</SelectItem>
                        {EXPERTISE_OPTIONS.map((exp) => (
                          <SelectItem key={exp.value} value={exp.value} className="text-right">
                            {exp.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">סטטוס</Label>
                    <p className="text-xs text-muted-foreground">
                      אבני דרך לא פעילות לא יוצגו בפרויקטים חדשים
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={watch("is_active") ?? true}
                    onCheckedChange={(checked) => setValue("is_active", checked)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="payment" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="percentage_of_total">
                      {t.dialog.percentageLabel}
                    </Label>
                    <div className="relative">
                      <Input
                        id="percentage_of_total"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...register("percentage_of_total", {
                          required: true,
                          valueAsNumber: true,
                          min: 0,
                          max: 100,
                        })}
                        className="pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
                    </div>
                    {errors.percentage_of_total && (
                      <p className="text-xs text-destructive">
                        יש להזין אחוז בין 0 ל-100
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fixed_amount">
                      {t.dialog.fixedAmountLabel}
                    </Label>
                    <div className="relative">
                      <Input
                        id="fixed_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register("fixed_amount", { valueAsNumber: true })}
                        className="pl-10"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₪
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.dialog.triggerTypeLabel}</Label>
                  <Select
                    dir="rtl"
                    value={watch("trigger_type") || "task_completion"}
                    onValueChange={(val) =>
                      setValue("trigger_type", val as UpdateMilestoneTemplateInput["trigger_type"])
                    }
                  >
                    <SelectTrigger dir="rtl" className="text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {TRIGGER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-right">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="mt-4">
                <MilestoneTaskLinker
                  milestoneTemplateId={milestoneId}
                  linkedTasks={milestone?.linked_tasks || []}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                {adminTranslations.common.cancel}
              </Button>
              <Button type="submit" disabled={updateMilestone.isPending}>
                {updateMilestone.isPending ? "שומר..." : adminTranslations.common.save}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
