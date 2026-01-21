import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Search, Pencil, Trash2, Tags } from "lucide-react";
import { adminTranslations } from "@/constants/adminTranslations";
import {
  usePaymentCategories,
  useUpdatePaymentCategory,
  useDeletePaymentCategory,
  type PaymentCategory,
} from "@/hooks/usePaymentCategories";
import { CreatePaymentCategoryDialog } from "@/components/admin/CreatePaymentCategoryDialog";
import { EditPaymentCategoryDialog } from "@/components/admin/EditPaymentCategoryDialog";

export default function PaymentCategoriesManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PaymentCategory | null>(null);
  
  const { data: categories, isLoading } = usePaymentCategories(true);
  const updateCategory = useUpdatePaymentCategory();
  const deleteCategory = useDeletePaymentCategory();
  
  const t = adminTranslations.payments.categories;
  
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!searchQuery.trim()) return categories;
    
    const query = searchQuery.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.name_en?.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);
  
  const handleToggleActive = async (category: PaymentCategory) => {
    await updateCategory.mutateAsync({
      id: category.id,
      is_active: !category.is_active,
    });
  };
  
  const handleEdit = (category: PaymentCategory) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };
  
  const handleDelete = (category: PaymentCategory) => {
    if (category.is_system) return;
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!selectedCategory) return;
    await deleteCategory.mutateAsync(selectedCategory.id);
    setDeleteDialogOpen(false);
    setSelectedCategory(null);
  };
  
  const columns: Column<PaymentCategory>[] = [
    {
      header: t.columns.name,
      cell: (cat) => (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: cat.color }}
          />
          <span className="font-medium">{cat.name}</span>
        </div>
      ),
    },
    {
      header: t.columns.nameEn,
      accessorKey: "name_en",
      cell: (cat) => (
        <span className="text-muted-foreground" dir="ltr">
          {cat.name_en || "-"}
        </span>
      ),
    },
    {
      header: t.columns.type,
      cell: (cat) => (
        <Badge variant={cat.is_system ? "secondary" : "outline"}>
          {cat.is_system ? t.badges.system : t.badges.custom}
        </Badge>
      ),
    },
    {
      header: t.columns.status,
      cell: (cat) => (
        <Switch
          checked={cat.is_active}
          onCheckedChange={() => handleToggleActive(cat)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      header: t.columns.order,
      accessorKey: "display_order",
      cell: (cat) => (
        <span className="text-muted-foreground">{cat.display_order}</span>
      ),
    },
    {
      header: t.columns.actions,
      cell: (cat) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(cat);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(cat);
            }}
            disabled={cat.is_system}
            className={cat.is_system ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Tags className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <p className="text-muted-foreground text-sm">{t.subtitle}</p>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            {t.createButton}
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        
        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            data={filteredCategories}
            columns={columns}
            pageSize={10}
          />
        )}
      </div>
      
      {/* Dialogs */}
      <CreatePaymentCategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      
      <EditPaymentCategoryDialog
        category={selectedCategory}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{adminTranslations.common.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteConfirm}
              <br />
              <span className="text-muted-foreground">{t.deleteWarning}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>{adminTranslations.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {adminTranslations.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
