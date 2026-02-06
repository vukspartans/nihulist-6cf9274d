import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateMilestoneTemplate } from "@/hooks/useMilestoneTemplates";
import { useMunicipalities } from "@/hooks/useMunicipalities";
import { PROJECT_TYPE_OPTIONS } from "@/constants/project";
import { EXPERTISE_OPTIONS } from "@/constants/advisor";
import { TRIGGER_TYPES, type CreateMilestoneTemplateInput } from "@/types/milestoneTemplate";
import { adminTranslations } from "@/constants/adminTranslations";

interface CreateMilestoneTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAdvisorSpecialty?: string;
  defaultProjectType?: string;
  defaultCategoryId?: string;
}

export function CreateMilestoneTemplateDialog({
  open,
  onOpenChange,
  defaultAdvisorSpecialty,
  defaultProjectType,
  defaultCategoryId,
}: CreateMilestoneTemplateDialogProps) {
  const t = adminTranslations.payments.milestones;
  const [activeTab, setActiveTab] = useState("basic");

  const createMilestone = useCreateMilestoneTemplate();
  const { data: municipalities = [] } = useMunicipalities();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateMilestoneTemplateInput & { category_id?: string }>({
    defaultValues: {
      name: "",
      name_en: "",
      description: "",
      project_type: defaultProjectType || "",
      municipality_id: "",
      advisor_specialty: defaultAdvisorSpecialty || "",
      percentage_of_total: 0,
      fixed_amount: undefined,
      currency: "ILS",
      trigger_type: "task_completion",
    },
  });

  const onSubmit = async (data: CreateMilestoneTemplateInput & { category_id?: string }) => {
    const submitData = {
      ...data,
      project_type: data.project_type || defaultProjectType || null,
      municipality_id: data.municipality_id || null,
      advisor_specialty: data.advisor_specialty || defaultAdvisorSpecialty || null,
      fixed_amount: data.fixed_amount || null,
      category_id: defaultCategoryId || null,
    };

    await createMilestone.mutateAsync(submitData as any);
    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    setActiveTab("basic");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{t.dialog.createTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4" dir="rtl">
            <TabsList className="grid w-full grid-cols-2" dir="rtl">
              <TabsTrigger value="basic">{t.dialog.basicTab}</TabsTrigger>
              <TabsTrigger value="payment">{t.dialog.paymentTab}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t.dialog.nameLabel}</Label>
                  <Input
                    id="name"
                    {...register("name", { required: true })}
                    placeholder={t.dialog.namePlaceholder}
                    className="text-right"
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
                  className="text-right"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.dialog.projectTypeLabel}</Label>
                  <Select
                    dir="rtl"
                    value={watch("project_type") || "__all__"}
                    onValueChange={(val) => setValue("project_type", val === "__all__" ? "" : val)}
                  >
                    <SelectTrigger dir="rtl" className="text-right">
                      <SelectValue placeholder={t.dialog.projectTypeAll} />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="__all__" className="text-right">{t.dialog.projectTypeAll}</SelectItem>
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
                    value={watch("municipality_id") || "__all__"}
                    onValueChange={(val) => setValue("municipality_id", val === "__all__" ? "" : val)}
                  >
                    <SelectTrigger dir="rtl" className="text-right">
                      <SelectValue placeholder={t.dialog.municipalityAll} />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="__all__" className="text-right">{t.dialog.municipalityAll}</SelectItem>
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
                    value={watch("advisor_specialty") || "__all__"}
                    onValueChange={(val) => setValue("advisor_specialty", val === "__all__" ? "" : val)}
                  >
                    <SelectTrigger dir="rtl" className="text-right">
                      <SelectValue placeholder={t.dialog.advisorSpecialtyAll} />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="__all__" className="text-right">{t.dialog.advisorSpecialtyAll}</SelectItem>
                      {EXPERTISE_OPTIONS.map((exp) => (
                        <SelectItem key={exp.value} value={exp.value} className="text-right">
                          {exp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                      className="pl-8 text-right"
                      dir="ltr"
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
                      className="pl-10 text-right"
                      dir="ltr"
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
                    setValue("trigger_type", val as CreateMilestoneTemplateInput["trigger_type"])
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
          </Tabs>

          <DialogFooter className="mt-6 flex-row-reverse gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {adminTranslations.common.cancel}
            </Button>
            <Button type="submit" disabled={createMilestone.isPending}>
              {createMilestone.isPending ? "יוצר..." : adminTranslations.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
