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
import { useCreateMilestoneTemplate } from "@/hooks/useMilestoneTemplates";
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

  const createMilestone = useCreateMilestoneTemplate();

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
      percentage_of_total: 0,
      fixed_amount: undefined,
      currency: "ILS",
      trigger_type: "task_completion",
    },
  });

  const onSubmit = async (data: CreateMilestoneTemplateInput & { category_id?: string }) => {
    const submitData = {
      ...data,
      project_type: defaultProjectType || null,
      municipality_id: null,
      advisor_specialty: defaultAdvisorSpecialty || null,
      fixed_amount: data.fixed_amount || null,
      category_id: defaultCategoryId || null,
    };

    await createMilestone.mutateAsync(submitData as any);
    reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{t.dialog.createTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.dialog.nameLabel} *</Label>
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

          {/* Description */}
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

          {/* Payment Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="percentage_of_total">
                {t.dialog.percentageLabel} *
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

          {/* Trigger Type */}
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
