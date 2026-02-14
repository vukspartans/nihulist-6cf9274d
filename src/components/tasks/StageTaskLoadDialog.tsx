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
import { Loader2, Clock, User, CheckCircle2, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBulkTaskCreation } from '@/hooks/useBulkTaskCreation';
import type { TaskTemplate } from '@/hooks/useTaskTemplatesAdmin';

interface StageTaskLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectType: string;
  phaseName: string;
  municipalityId?: string | null;
  existingTemplateIds?: Set<string>;
  onTasksCreated: () => void;
}

export function StageTaskLoadDialog({
  open,
  onOpenChange,
  projectId,
  projectType,
  phaseName,
  municipalityId,
  onTasksCreated,
}: StageTaskLoadDialogProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingTemplateIds, setExistingTemplateIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { createTasksFromTemplates } = useBulkTaskCreation();

  const fetchTemplatesForPhase = useCallback(async () => {
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

      // Find the licensing_phase matching phaseName + projectType
      const { data: phaseData } = await supabase
        .from('licensing_phases')
        .select('id')
        .eq('name', phaseName)
        .eq('is_active', true);

      if (!phaseData || phaseData.length === 0) {
        setTemplates([]);
        return;
      }

      const phaseIds = phaseData.map(p => p.id);

      // Fetch templates linked to these phases, scoped by project type
      let query = supabase
        .from('task_templates')
        .select('*, municipalities:municipality_id (id, name), licensing_phases:licensing_phase_id (id, name)')
        .in('licensing_phase_id', phaseIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      // Try to filter by project_type or null
      query = query.or(`project_type.eq.${projectType},project_type.is.null`);

      if (municipalityId) {
        query = query.or(`municipality_id.eq.${municipalityId},municipality_id.is.null`);
      }

      const { data } = await query;
      const results = (data || []) as TaskTemplate[];

      setTemplates(results);
      // Pre-select ALL templates so user starts with everything checked
      const newSelected = new Set<string>(results.map(t => t.id));
      setSelectedIds(newSelected);
    } catch (error) {
      console.error('Error fetching stage templates:', error);
    } finally {
      setLoading(false);
    }
  }, [phaseName, projectType, municipalityId, projectId]);

  useEffect(() => {
    if (open && phaseName) {
      fetchTemplatesForPhase();
    }
  }, [open, phaseName, fetchTemplatesForPhase]);

  const toggleTemplate = (id: string) => {
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    // Only create tasks for templates not already loaded
    const selected = templates.filter(t => selectedIds.has(t.id) && !existingTemplateIds.has(t.id));
    if (selected.length === 0) return;

    setSubmitting(true);
    try {
      // Override phase on templates to ensure correct tagging
      const templatesWithPhase = selected.map(t => ({
        ...t,
        licensing_phases: t.licensing_phases || { id: null, name: phaseName },
      }));
      await createTasksFromTemplates({
        projectId,
        templates: templatesWithPhase,
      });
      onTasksCreated();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectableCount = templates.filter(t => !existingTemplateIds.has(t.id)).length;
  const allNewSelected = selectableCount > 0 && selectedIds.size === selectableCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg !h-auto max-h-[70vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            משימות לשלב: {phaseName}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? 'טוען תבניות...'
              : templates.length === 0
              ? 'לא הוגדרו תבניות משימות לשלב זה. ניתן להוסיף משימות ידנית.'
              : `נמצאו ${selectableCount} משימות חדשות עבור שלב זה. בחר אילו לטעון.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-4 px-4 sm:-mx-6 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {templates.map(t => {
                const alreadyLoaded = existingTemplateIds.has(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(t.id)}
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
          )}
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {templates.length === 0 ? 'סגור' : 'דלג'}
          </Button>
          {templates.length > 0 && (
            <Button
              onClick={handleSubmit}
              disabled={selectedIds.size === 0 || submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              טען {selectedIds.size > 0 ? `(${selectedIds.size})` : ''} משימות
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
