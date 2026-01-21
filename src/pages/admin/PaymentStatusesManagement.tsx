import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { SortableDataTable, Column } from '@/components/admin/SortableDataTable';
import { SearchBar } from '@/components/admin/SearchBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, Bell, PenTool, CheckSquare, Upload, Flag } from 'lucide-react';
import { 
  usePaymentStatusDefinitions,
  useUpdatePaymentStatusDefinition,
  useDeletePaymentStatusDefinition,
  useReorderPaymentStatuses,
} from '@/hooks/usePaymentStatusDefinitions';
import { CreatePaymentStatusDialog } from '@/components/admin/CreatePaymentStatusDialog';
import { EditPaymentStatusDialog } from '@/components/admin/EditPaymentStatusDialog';
import { PaymentWorkflowPreview } from '@/components/admin/PaymentWorkflowPreview';
import type { PaymentStatusDefinition } from '@/types/paymentStatus';
import { adminTranslations } from '@/constants/adminTranslations';

export default function PaymentStatusesManagement() {
  const t = adminTranslations.payments.statuses;
  const { data: statuses = [], isLoading } = usePaymentStatusDefinitions();
  const updateMutation = useUpdatePaymentStatusDefinition();
  const deleteMutation = useDeletePaymentStatusDefinition();
  const reorderMutation = useReorderPaymentStatuses();

  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatusDefinition | null>(null);

  const filteredStatuses = statuses.filter(status =>
    status.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    status.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (status.name_en && status.name_en.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleEdit = (status: PaymentStatusDefinition) => {
    setSelectedStatus(status);
    setEditOpen(true);
  };

  const handleDeleteClick = (status: PaymentStatusDefinition) => {
    setSelectedStatus(status);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (selectedStatus) {
      await deleteMutation.mutateAsync(selectedStatus.id);
      setDeleteOpen(false);
      setSelectedStatus(null);
    }
  };

  const handleToggleActive = async (status: PaymentStatusDefinition) => {
    await updateMutation.mutateAsync({
      id: status.id,
      is_active: !status.is_active,
    });
  };

  const handleReorder = (orderedIds: { id: string; display_order: number }[]) => {
    reorderMutation.mutate(orderedIds);
  };

  const getSignatureIcon = (type: string) => {
    switch (type) {
      case 'drawn':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PenTool className="w-4 h-4 text-primary" />
              </TooltipTrigger>
              <TooltipContent>חתימה ידנית</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'checkbox':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckSquare className="w-4 h-4 text-primary" />
              </TooltipTrigger>
              <TooltipContent>אישור בסימון</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'uploaded':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Upload className="w-4 h-4 text-primary" />
              </TooltipTrigger>
              <TooltipContent>העלאת חתימה</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return <span className="text-muted-foreground">-</span>;
    }
  };

  const columns: Column<PaymentStatusDefinition>[] = [
    {
      header: t.columns.name,
      cell: (status: PaymentStatusDefinition) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: status.color }}
          />
          <span className="font-medium">{status.name}</span>
          {status.name_en && (
            <span className="text-xs text-muted-foreground">({status.name_en})</span>
          )}
        </div>
      ),
    },
    {
      header: t.columns.code,
      cell: (status: PaymentStatusDefinition) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{status.code}</code>
      ),
    },
    {
      header: t.columns.type,
      cell: (status: PaymentStatusDefinition) => (
        <Badge variant={status.is_system ? 'secondary' : 'outline'}>
          {status.is_system ? t.badges.system : t.badges.custom}
        </Badge>
      ),
    },
    {
      header: t.columns.terminal,
      cell: (status: PaymentStatusDefinition) => (
        status.is_terminal ? (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            <Flag className="w-3 h-3 ml-1" />
            {t.badges.terminal}
          </Badge>
        ) : null
      ),
    },
    {
      header: t.columns.notification,
      cell: (status: PaymentStatusDefinition) => (
        status.notify_on_enter ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Bell className="w-4 h-4 text-primary" />
              </TooltipTrigger>
              <TooltipContent>התראה פעילה</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      header: t.columns.signature,
      cell: (status: PaymentStatusDefinition) => getSignatureIcon(status.signature_type),
    },
    {
      header: t.columns.status,
      cell: (status: PaymentStatusDefinition) => (
        <Switch
          checked={status.is_active}
          onCheckedChange={() => handleToggleActive(status)}
          disabled={updateMutation.isPending}
        />
      ),
    },
    {
      header: t.columns.actions,
      cell: (status: PaymentStatusDefinition) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(status);
            }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          {!status.is_system && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(status);
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            {t.createButton}
          </Button>
        </div>

        {/* Workflow Preview */}
        {statuses.length > 0 && (
          <PaymentWorkflowPreview statuses={statuses} />
        )}

        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.searchPlaceholder}
        />

        {/* Table */}
        <SortableDataTable
          columns={columns}
          data={filteredStatuses}
          onReorder={handleReorder}
          isReordering={reorderMutation.isPending}
        />
      </div>

      {/* Dialogs */}
      <CreatePaymentStatusDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <EditPaymentStatusDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        status={selectedStatus}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שלב אישור</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStatus?.is_system 
                ? t.systemStatusWarning
                : t.deleteConfirm
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{adminTranslations.common.cancel}</AlertDialogCancel>
            {!selectedStatus?.is_system && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {adminTranslations.common.delete}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
