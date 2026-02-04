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
  useServiceScopeTemplates,
  useDeleteServiceScopeTemplate,
  ServiceScopeTemplate,
} from "@/hooks/useRFPTemplatesAdmin";
import { CreateServiceScopeTemplateDialog } from "./CreateServiceScopeTemplateDialog";
import { EditServiceScopeTemplateDialog } from "./EditServiceScopeTemplateDialog";

interface CategoryServicesTabProps {
  categoryId: string;
  advisorSpecialty: string;
  projectType: string;
}

export function CategoryServicesTab({
  categoryId,
  advisorSpecialty,
  projectType,
}: CategoryServicesTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceScopeTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: services, isLoading } = useServiceScopeTemplates(undefined, categoryId);
  const deleteMutation = useDeleteServiceScopeTemplate();

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">שירותים בקטגוריה</h3>
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          הוסף שירות
        </Button>
      </div>

      {services && services.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם השירות</TableHead>
              <TableHead className="text-right">קטגוריית שכ"ט</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.task_name}</TableCell>
                <TableCell>{service.default_fee_category || "-"}</TableCell>
                <TableCell>
                  {service.is_optional ? (
                    <Badge variant="secondary">אופציונלי</Badge>
                  ) : (
                    <Badge variant="default">חובה</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingService(service)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteId(service.id)}
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
          <p>אין שירותים בקטגוריה זו.</p>
          <p className="text-sm mt-1">הוסף שירות ראשון כדי להתחיל.</p>
        </div>
      )}

      {/* Create Service Dialog */}
      <CreateServiceScopeTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultAdvisorSpecialty={advisorSpecialty}
        defaultCategoryId={categoryId}
        defaultProjectType={projectType}
      />

      {/* Edit Service Dialog */}
      <EditServiceScopeTemplateDialog
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        template={editingService}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שירות</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את השירות?
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
