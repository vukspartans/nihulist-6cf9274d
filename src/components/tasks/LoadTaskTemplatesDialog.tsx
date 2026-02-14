import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, Clock, User, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBulkTaskCreation } from '@/hooks/useBulkTaskCreation';
import type { TaskTemplate } from '@/hooks/useTaskTemplatesAdmin';

interface LoadTaskTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectType: string;
  municipalityId?: string | null;
  existingTemplateIds?: Set<string>;
  onTasksCreated: () => void;
  currentPhase?: string | null;
}

interface GroupedTemplates {
  phaseName: string;
  phaseId: string | null;
  templates: TaskTemplate[];
}

export function LoadTaskTemplatesDialog({
  open,
  onOpenChange,
  projectId,
  projectType,
  municipalityId,
  onTasksCreated,
  currentPhase,
}: LoadTaskTemplatesDialogProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [existingTemplateIds, setExistingTemplateIds] = useState<Set<string>>(new Set());
  const { createTasksFromTemplates } = useBulkTaskCreation();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // Self-fetch existing template IDs
      const { data: existingData } = await supabase
        .from('project_tasks')
        .select('template_id')
        .eq('project_id', projectId)
        .not('template_id', 'is', null);
      const fetchedIds = new Set((existingData || []).map((d: any) => d.template_id as string));
      setExistingTemplateIds(fetchedIds);

      // Strategy: municipality+projectType → municipality general → projectType general
      let data: TaskTemplate[] = [];

      if (municipalityId) {
        // Try municipality + project type
        const { data: specific } = await supabase
          .from('task_templates')
          .select('*, municipalities:municipality_id (id, name), licensing_phases:licensing_phase_id (id, name)')
          .eq('municipality_id', municipalityId)
          .eq('project_type', projectType)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (specific && specific.length > 0) {
          data = specific as TaskTemplate[];
        } else {
          // Try municipality general
          const { data: munGeneral } = await supabase
            .from('task_templates')
            .select('*, municipalities:municipality_id (id, name), licensing_phases:licensing_phase_id (id, name)')
            .eq('municipality_id', municipalityId)
            .is('project_type', null)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

          if (munGeneral && munGeneral.length > 0) {
            data = munGeneral as TaskTemplate[];
          }
        }
      }

      if (data.length === 0) {
        // Project type general
        const { data: projGeneral } = await supabase
          .from('task_templates')
          .select('*, municipalities:municipality_id (id, name), licensing_phases:licensing_phase_id (id, name)')
          .is('municipality_id', null)
          .eq('project_type', projectType)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (projGeneral && projGeneral.length > 0) {
          data = projGeneral as TaskTemplate[];
        }
      }

      // If still nothing, get all active templates for this project type (including null)
      if (data.length === 0) {
        const { data: allTemplates } = await supabase
          .from('task_templates')
          .select('*, municipalities:municipality_id (id, name), licensing_phases:licensing_phase_id (id, name)')
          .or(`project_type.eq.${projectType},project_type.is.null`)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        data = (allTemplates || []) as TaskTemplate[];
      }

      // Filter by current phase if provided
      if (currentPhase) {
        data = data.filter(t => t.licensing_phases?.name === currentPhase);
      }

      setTemplates(data);
      // Pre-select all non-existing templates
      const newSelected = new Set<string>();
      data.forEach(t => {
        if (!fetchedIds.has(t.id)) {
          newSelected.add(t.id);
        }
      });
      setSelectedIds(newSelected);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [projectType, municipalityId, projectId, currentPhase]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, fetchTemplates]);

  // Group templates by licensing phase
  const grouped: GroupedTemplates[] = (() => {
    const groups = new Map<string, GroupedTemplates>();
    templates.forEach(t => {
      const key = t.licensing_phase_id || '__general__';
      if (!groups.has(key)) {
        groups.set(key, {
          phaseName: t.licensing_phases?.name || 'משימות כלליות',
          phaseId: t.licensing_phase_id,
          templates: [],
        });
      }
      groups.get(key)!.templates.push(t);
    });
    return Array.from(groups.values());
  })();

  const toggleTemplate = (id: string) => {
    if (existingTemplateIds.has(id)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const selectable = templates.filter(t => !existingTemplateIds.has(t.id));
    if (selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map(t => t.id)));
    }
  };

  const handleSubmit = async () => {
    const selected = templates.filter(t => selectedIds.has(t.id));
    if (selected.length === 0) return;

    setSubmitting(true);
    try {
      await createTasksFromTemplates({
        projectId,
        templates: selected,
      });
      onTasksCreated();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectableCount = templates.filter(t => !existingTemplateIds.has(t.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl !h-[80vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            טעינת משימות מתבניות
          </DialogTitle>
          <DialogDescription>
            {currentPhase
              ? `משימות לשלב: ${currentPhase}`
              : `בחר משימות מהתבניות המוגדרות עבור סוג פרויקט: ${projectType}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-4 px-4 sm:-mx-6 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>לא נמצאו תבניות משימות עבור סוג פרויקט זה.</p>
              <p className="text-sm mt-2">ניתן ליצור תבניות בממשק הניהול.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(group => (
                <div key={group.phaseId || '__general__'} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                    {group.phaseName}
                  </h4>
                  <div className="space-y-1">
                    {group.templates.map(t => {
                      const alreadyLoaded = existingTemplateIds.has(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                            alreadyLoaded ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Checkbox
                            checked={alreadyLoaded || selectedIds.has(t.id)}
                            disabled={alreadyLoaded}
                            onCheckedChange={() => toggleTemplate(t.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{t.name}</span>
                              {alreadyLoaded && (
                                <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                                  <CheckCircle2 className="h-3 w-3" />
                                  נטען
                                </Badge>
                              )}
                              {t.is_milestone && (
                                <Badge variant="secondary" className="text-[10px] shrink-0">אבן דרך</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                              {t.default_duration_days && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {t.default_duration_days} ימים
                                </span>
                              )}
                              {t.advisor_specialty && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {t.advisor_specialty}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between pt-3 border-t">
          {templates.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              disabled={selectableCount === 0}
            >
              {selectedIds.size === selectableCount ? 'בטל הכל' : 'בחר הכל'}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            טען {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} משימות
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
