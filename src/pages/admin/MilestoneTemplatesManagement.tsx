import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle, Hand, Calendar, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { MilestonePercentageSummary } from "@/components/admin/MilestonePercentageSummary";
import { CreateMilestoneTemplateDialog } from "@/components/admin/CreateMilestoneTemplateDialog";
import { EditMilestoneTemplateDialog } from "@/components/admin/EditMilestoneTemplateDialog";
import {
  useMilestoneTemplates,
  useUpdateMilestoneTemplate,
  useDeleteMilestoneTemplate,
} from "@/hooks/useMilestoneTemplates";
import { adminTranslations } from "@/constants/adminTranslations";
import { PROJECT_TYPES } from "@/constants/project";
import type { MilestoneTemplate } from "@/types/milestoneTemplate";

const getTriggerIcon = (triggerType: string) => {
  switch (triggerType) {
    case "task_completion":
      return CheckCircle;
    case "manual":
      return Hand;
    case "date_based":
      return Calendar;
    default:
      return CheckCircle;
  }
};

export default function MilestoneTemplatesManagement() {
  const t = adminTranslations.payments.milestones;
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editMilestoneId, setEditMilestoneId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: milestones = [], isLoading } = useMilestoneTemplates();
  const updateMilestone = useUpdateMilestoneTemplate();
  const deleteMilestone = useDeleteMilestoneTemplate();

  const filteredMilestones = milestones.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.name_en && m.name_en.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleActive = async (milestone: MilestoneTemplate) => {
    await updateMilestone.mutateAsync({
      id: milestone.id,
      is_active: !milestone.is_active,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteMilestone.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const getProjectTypeLabel = (value: string | null) => {
    if (!value) return t.dialog.projectTypeAll;
    const found = PROJECT_TYPES.find((pt) => pt.value === value);
    return found?.label || value;
  };

  const columns = [
    {
      key: "display_order",
      label: t.columns.order,
      render: (m: MilestoneTemplate) => (
        <span className="text-muted-foreground text-sm">{m.display_order}</span>
      ),
    },
    {
      key: "name",
      label: t.columns.name,
      render: (m: MilestoneTemplate) => (
        <div className="flex flex-col">
          <span className="font-medium">{m.name}</span>
          {m.name_en && (
            <span className="text-xs text-muted-foreground" dir="ltr">
              {m.name_en}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "project_type",
      label: t.columns.projectType,
      render: (m: MilestoneTemplate) => (
        <Badge variant="outline" className="text-xs">
          {getProjectTypeLabel(m.project_type)}
        </Badge>
      ),
    },
    {
      key: "percentage_of_total",
      label: t.columns.percentage,
      render: (m: MilestoneTemplate) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={Number(m.percentage_of_total)} className="h-2 flex-1" />
          <span className="text-sm font-medium w-12 text-left">
            {Number(m.percentage_of_total).toFixed(0)}%
          </span>
        </div>
      ),
    },
    {
      key: "trigger_type",
      label: t.columns.trigger,
      render: (m: MilestoneTemplate) => {
        const Icon = getTriggerIcon(m.trigger_type);
        const label = t.triggerTypes[m.trigger_type as keyof typeof t.triggerTypes] || m.trigger_type;
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{label}</span>
          </div>
        );
      },
    },
    {
      key: "linked_tasks",
      label: t.columns.linkedTasks,
      render: (m: MilestoneTemplate) => (
        <div className="flex items-center gap-1.5">
          <Link className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary" className="text-xs">
            {m.linked_tasks?.length || 0}
          </Badge>
        </div>
      ),
    },
    {
      key: "is_active",
      label: t.columns.status,
      render: (m: MilestoneTemplate) => (
        <Switch
          checked={m.is_active}
          onCheckedChange={() => handleToggleActive(m)}
          disabled={updateMilestone.isPending}
        />
      ),
    },
    {
      key: "actions",
      label: t.columns.actions,
      render: (m: MilestoneTemplate) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditMilestoneId(m.id)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!m.is_system && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteConfirmId(m.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            {t.createButton}
          </Button>
        </div>

        {/* Percentage Summary */}
        <MilestonePercentageSummary milestones={milestones} />

        {/* Search */}
        <div className="flex items-center gap-4">
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Table */}
        <DataTable
          data={filteredMilestones}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="אין תבניות אבני דרך להצגה"
        />

        {/* Dialogs */}
        <CreateMilestoneTemplateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <EditMilestoneTemplateDialog
          open={!!editMilestoneId}
          onOpenChange={(open) => !open && setEditMilestoneId(null)}
          milestoneId={editMilestoneId}
        />

        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteConfirm}</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו לא ניתנת לביטול.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{adminTranslations.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {adminTranslations.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
