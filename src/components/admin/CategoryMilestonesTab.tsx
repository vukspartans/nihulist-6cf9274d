import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  useMilestoneTemplates,
  useDeleteMilestoneTemplate,
} from "@/hooks/useMilestoneTemplates";
import { CreateMilestoneTemplateDialog } from "./CreateMilestoneTemplateDialog";
import { EditMilestoneTemplateDialog } from "./EditMilestoneTemplateDialog";
import type { MilestoneTemplate } from "@/types/milestoneTemplate";
import { TRIGGER_TYPES } from "@/types/milestoneTemplate";

interface CategoryMilestonesTabProps {
  categoryId: string;
  advisorSpecialty: string;
  projectType: string;
}

export function CategoryMilestonesTab({
  categoryId,
  advisorSpecialty,
  projectType,
}: CategoryMilestonesTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: milestones, isLoading } = useMilestoneTemplates(true, categoryId);
  const deleteMutation = useDeleteMilestoneTemplate();

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    const found = TRIGGER_TYPES.find((t) => t.value === triggerType);
    return found?.label || triggerType;
  };

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">אבני דרך בקטגוריה</h3>
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          הוסף אבן דרך
        </Button>
      </div>

      {milestones && milestones.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">אחוז מהסכום</TableHead>
              <TableHead className="text-right">טריגר</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.map((milestone) => (
              <TableRow key={milestone.id}>
                <TableCell className="font-medium">{milestone.name}</TableCell>
                <TableCell>{milestone.percentage_of_total}%</TableCell>
                <TableCell>{getTriggerLabel(milestone.trigger_type)}</TableCell>
                <TableCell>
                  {milestone.is_active ? (
                    <Badge variant="default">פעיל</Badge>
                  ) : (
                    <Badge variant="secondary">לא פעיל</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingMilestone(milestone)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteId(milestone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p>אין אבני דרך בקטגוריה זו.</p>
          <p className="text-sm mt-1">הוסף אבן דרך ראשונה כדי להתחיל.</p>
        </div>
      )}

      {/* Create Milestone Dialog */}
      <CreateMilestoneTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultAdvisorSpecialty={advisorSpecialty}
        defaultProjectType={projectType}
        defaultCategoryId={categoryId}
      />

      {/* Edit Milestone Dialog */}
      <EditMilestoneTemplateDialog
        open={!!editingMilestone}
        onOpenChange={(open) => !open && setEditingMilestone(null)}
        template={editingMilestone}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת אבן דרך</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את אבן הדרך?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
