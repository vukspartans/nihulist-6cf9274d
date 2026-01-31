import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2,
  ArrowLeftRight 
} from "lucide-react";
import { 
  useCreateTemplateDependency, 
  useDeleteTemplateDependency 
} from "@/hooks/useHierarchicalTemplates";
import { DEPENDENCY_TYPE_LABELS, DEPENDENCY_TYPE_SHORT } from "@/types/taskHierarchy";
import type { HierarchicalTaskTemplate, TemplateDependency, DependencyType } from "@/types/taskHierarchy";

interface DependencySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: HierarchicalTaskTemplate;
  allTemplates: HierarchicalTaskTemplate[];
  existingDependencies: TemplateDependency[];
}

export function DependencySelector({
  open,
  onOpenChange,
  template,
  allTemplates,
  existingDependencies,
}: DependencySelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<DependencyType>("finish_to_start");
  const [lagDays, setLagDays] = useState<number>(0);

  const createDependency = useCreateTemplateDependency();
  const deleteDependency = useDeleteTemplateDependency();

  // Filter out self and already added dependencies
  const existingDepIds = new Set(existingDependencies.map(d => d.depends_on_template_id));
  const availableTemplates = allTemplates.filter(t => 
    t.id !== template.id && !existingDepIds.has(t.id)
  );

  const handleAddDependency = async () => {
    if (!selectedTemplateId) return;

    await createDependency.mutateAsync({
      template_id: template.id,
      depends_on_template_id: selectedTemplateId,
      dependency_type: dependencyType,
      lag_days: lagDays,
    });

    setSelectedTemplateId("");
    setLagDays(0);
  };

  const handleRemoveDependency = async (depId: string) => {
    await deleteDependency.mutateAsync(depId);
  };

  const getTemplateName = (id: string) => {
    const t = allTemplates.find(t => t.id === id);
    return t ? `${t.wbs_code || ''} ${t.name}`.trim() : 'לא ידוע';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            ניהול תלויות
          </DialogTitle>
          <DialogDescription>
            הגדר משימות קדם עבור: <strong>{template.wbs_code} {template.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing Dependencies */}
          <div className="space-y-2">
            <Label>תלויות קיימות</Label>
            {existingDependencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין תלויות מוגדרות</p>
            ) : (
              <div className="space-y-2">
                {existingDependencies.map((dep) => (
                  <div 
                    key={dep.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {dep.depends_on_template?.wbs_code || '?'}
                      </Badge>
                      <span className="text-sm">
                        {dep.depends_on_template?.name || 'לא ידוע'}
                      </span>
                      <Badge variant="secondary">
                        {DEPENDENCY_TYPE_SHORT[dep.dependency_type as DependencyType]}
                      </Badge>
                      {dep.lag_days !== 0 && (
                        <Badge variant="outline">
                          {dep.lag_days > 0 ? `+${dep.lag_days}` : dep.lag_days} ימים
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveDependency(dep.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Dependency */}
          {availableTemplates.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <Label>הוסף תלות חדשה</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">משימת קדם</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר משימה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground">
                              {t.wbs_code || t.hierarchy_level}
                            </span>
                            {t.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">סוג תלות</Label>
                  <Select 
                    value={dependencyType} 
                    onValueChange={(v) => setDependencyType(v as DependencyType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(DEPENDENCY_TYPE_LABELS) as [DependencyType, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Lag (ימים)</Label>
                  <Input
                    type="number"
                    value={lagDays}
                    onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
                    className="text-center"
                  />
                </div>
              </div>

              <Button 
                onClick={handleAddDependency} 
                disabled={!selectedTemplateId || createDependency.isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף תלות
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
