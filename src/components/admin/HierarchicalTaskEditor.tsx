import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronLeft,
  Pencil, 
  Trash2, 
  Link2,
  Loader2,
  GripVertical,
  FolderPlus,
  AlertCircle
} from "lucide-react";
import { 
  useHierarchicalTemplates, 
  useAllTemplateDependencies,
  buildTemplateTree,
  generateWBSCode,
  generateHierarchyPath 
} from "@/hooks/useHierarchicalTemplates";
import { useCreateTaskTemplate, useUpdateTaskTemplate, useDeleteTaskTemplate } from "@/hooks/useTaskTemplatesAdmin";
import { DEPENDENCY_TYPE_SHORT } from "@/types/taskHierarchy";
import type { HierarchicalTaskTemplate, TemplateDependency } from "@/types/taskHierarchy";
import { DependencySelector } from "./DependencySelector";
import { cn } from "@/lib/utils";

interface HierarchicalTaskEditorProps {
  municipalityId: string;
  municipalityName: string;
  projectType: string;
  licensingPhaseId: string;
  licensingPhaseName: string;
}

export function HierarchicalTaskEditor({
  municipalityId,
  municipalityName,
  projectType,
  licensingPhaseId,
  licensingPhaseName,
}: HierarchicalTaskEditorProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'duration' | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [selectedTemplateForDeps, setSelectedTemplateForDeps] = useState<HierarchicalTaskTemplate | null>(null);

  const { data: templates, isLoading } = useHierarchicalTemplates({
    municipalityId,
    projectType,
    licensingPhaseId,
  });

  const { data: allDependencies } = useAllTemplateDependencies({
    municipalityId,
    projectType,
    licensingPhaseId,
  });

  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();

  // Build dependency map for quick lookup
  const dependencyMap = useMemo(() => {
    const map = new Map<string, TemplateDependency[]>();
    allDependencies?.forEach(dep => {
      if (!map.has(dep.template_id)) {
        map.set(dep.template_id, []);
      }
      map.get(dep.template_id)!.push(dep);
    });
    return map;
  }, [allDependencies]);

  // Build tree structure
  const templateTree = useMemo(() => {
    if (!templates) return [];
    return buildTemplateTree(templates);
  }, [templates]);

  // Flatten tree for table rendering with indent levels
  const flattenTree = (
    nodes: HierarchicalTaskTemplate[],
    level: number = 0
  ): { template: HierarchicalTaskTemplate; level: number }[] => {
    const result: { template: HierarchicalTaskTemplate; level: number }[] = [];
    nodes.forEach(node => {
      result.push({ template: node, level });
      if (node.children && node.children.length > 0 && expandedRows.has(node.id)) {
        result.push(...flattenTree(node.children, level + 1));
      }
    });
    return result;
  };

  const flatTemplates = useMemo(() => flattenTree(templateTree), [templateTree, expandedRows]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const hasChildren = (template: HierarchicalTaskTemplate) => {
    return template.children && template.children.length > 0;
  };

  const startEdit = (id: string, field: 'name' | 'duration', value: string) => {
    setEditingId(id);
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingId || !editingField) return;
    
    const updates: any = { id: editingId };
    if (editingField === 'name') {
      updates.name = editValue;
    } else if (editingField === 'duration') {
      updates.default_duration_days = parseInt(editValue) || null;
    }
    
    await updateTemplate.mutateAsync(updates);
    setEditingId(null);
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingField(null);
    }
  };

  const addTask = async (parentId?: string) => {
    const parentIndex = parentId 
      ? templates?.filter(t => t.parent_template_id === parentId).length || 0
      : templates?.filter(t => !t.parent_template_id).length || 0;

    const parent = parentId ? templates?.find(t => t.id === parentId) : null;
    const wbsCode = generateWBSCode(parent?.wbs_code || null, parentIndex);
    const hierarchyPath = generateHierarchyPath(parent?.hierarchy_path || null, parentIndex);

    await createTemplate.mutateAsync({
      name: 'משימה חדשה',
      municipality_id: municipalityId,
      project_type: projectType,
      licensing_phase_id: licensingPhaseId,
      parent_template_id: parentId || null,
      hierarchy_level: (parent?.hierarchy_level || 0) + 1,
      wbs_code: wbsCode,
      hierarchy_path: hierarchyPath,
      display_order: parentIndex,
    } as any);
  };

  const openDependencyDialog = (template: HierarchicalTaskTemplate) => {
    setSelectedTemplateForDeps(template);
    setDependencyDialogOpen(true);
  };

  const formatDependencies = (templateId: string) => {
    const deps = dependencyMap.get(templateId);
    if (!deps || deps.length === 0) return '-';
    
    return deps.map(d => {
      const typeShort = DEPENDENCY_TYPE_SHORT[d.dependency_type as keyof typeof DEPENDENCY_TYPE_SHORT] || 'FS';
      const wbs = d.depends_on_template?.wbs_code || '?';
      const lag = d.lag_days ? `+${d.lag_days}` : '';
      return `${wbs}${typeShort}${lag}`;
    }).join(', ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>משימות - {licensingPhaseName}</CardTitle>
              <CardDescription>
                {municipalityName} • {projectType}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addTask()}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף משימה
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {flatTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p>אין משימות מוגדרות לשלב זה</p>
              <Button variant="outline" className="mt-4" onClick={() => addTask()}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף משימה ראשונה
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-20">WBS</TableHead>
                  <TableHead>שם משימה</TableHead>
                  <TableHead className="w-24">משך (ימים)</TableHead>
                  <TableHead className="w-32">תלויות</TableHead>
                  <TableHead className="w-24">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatTemplates.map(({ template, level }) => (
                  <TableRow key={template.id} className="group">
                    <TableCell className="text-muted-foreground">
                      <GripVertical className="w-4 h-4 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {hasChildren(template) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleExpand(template.id)}
                          >
                            {expandedRows.has(template.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronLeft className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Badge variant="outline" className="font-mono">
                          {template.wbs_code || template.hierarchy_level}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div 
                        className="flex items-center"
                        style={{ paddingRight: `${level * 24}px` }}
                      >
                        {editingId === template.id && editingField === 'name' ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="h-8"
                          />
                        ) : (
                          <span
                            className={cn(
                              "cursor-pointer hover:text-primary",
                              template.is_milestone && "font-semibold"
                            )}
                            onClick={() => startEdit(template.id, 'name', template.name)}
                          >
                            {template.name}
                            {template.is_milestone && (
                              <Badge variant="secondary" className="mr-2">אבן דרך</Badge>
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === template.id && editingField === 'duration' ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          autoFocus
                          className="h-8 w-20"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary"
                          onClick={() => startEdit(template.id, 'duration', template.default_duration_days?.toString() || '')}
                        >
                          {template.default_duration_days || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span 
                        className="cursor-pointer hover:text-primary text-sm font-mono"
                        onClick={() => openDependencyDialog(template)}
                      >
                        {formatDependencies(template.id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => addTask(template.id)}>
                            <FolderPlus className="w-4 h-4 ml-2" />
                            הוסף תת-משימה
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDependencyDialog(template)}>
                            <Link2 className="w-4 h-4 ml-2" />
                            ניהול תלויות
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startEdit(template.id, 'name', template.name)}>
                            <Pencil className="w-4 h-4 ml-2" />
                            ערוך
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteTemplate.mutate(template.id)}
                          >
                            <Trash2 className="w-4 h-4 ml-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedTemplateForDeps && (
        <DependencySelector
          open={dependencyDialogOpen}
          onOpenChange={setDependencyDialogOpen}
          template={selectedTemplateForDeps}
          allTemplates={templates || []}
          existingDependencies={dependencyMap.get(selectedTemplateForDeps.id) || []}
        />
      )}
    </>
  );
}
