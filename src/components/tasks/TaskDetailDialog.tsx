import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TaskAssignment } from './TaskAssignment';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskDependencySelector } from './TaskDependencySelector';
import { TaskCommentsSection } from './TaskCommentsSection';
import { TaskFilesSection } from './TaskFilesSection';
import { useTaskDependencies } from '@/hooks/useTaskDependencies';
import { PROJECT_PHASES } from '@/constants/project';
import { FileText, MessageSquare, Settings } from 'lucide-react';
import type { ProjectTask, TaskStatus, ProjectAdvisorOption } from '@/types/task';

interface TaskDetailDialogProps {
  task: ProjectTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (taskId: string, updates: Partial<ProjectTask>) => Promise<boolean>;
  projectAdvisors: ProjectAdvisorOption[];
  allProjectTasks?: { id: string; name: string; status: string }[];
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בביצוע' },
  { value: 'blocked', label: 'חסום' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

export function TaskDetailDialog({ task, open, onOpenChange, onSubmit, projectAdvisors, allProjectTasks = [] }: TaskDetailDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ProjectTask>>({});
  const [showDepBlockAlert, setShowDepBlockAlert] = useState(false);

  const {
    dependencies,
    loading: depsLoading,
    addDependency,
    removeDependency,
    hasUnfinishedDependencies,
    unfinishedDependencies,
  } = useTaskDependencies(task?.id || null);

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description || '',
        phase: task.phase || '',
        status: task.status,
        planned_start_date: task.planned_start_date || '',
        planned_end_date: task.planned_end_date || '',
        actual_start_date: task.actual_start_date || '',
        actual_end_date: task.actual_end_date || '',
        assigned_advisor_id: task.assigned_advisor_id,
        progress_percent: task.progress_percent || 0,
        is_milestone: task.is_milestone || false,
        is_blocked: task.is_blocked || false,
        block_reason: task.block_reason || '',
        notes: task.notes || '',
      });
    }
  }, [task]);

  const handleStatusChange = (val: TaskStatus) => {
    if (val === 'completed' && hasUnfinishedDependencies) {
      setShowDepBlockAlert(true);
      return;
    }
    setFormData({ ...formData, status: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !formData.name?.trim()) return;

    if (formData.status === 'completed' && hasUnfinishedDependencies) {
      setShowDepBlockAlert(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(task.id, formData);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>פרטי משימה</DialogTitle>
              <TaskStatusBadge status={task.status} />
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="details" className="gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                פרטים
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                קבצים
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                תגובות
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">שם המשימה *</Label>
                  <Input
                    id="edit_name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_description">תיאור</Label>
                  <Textarea
                    id="edit_description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>סטטוס</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(val) => handleStatusChange(val as TaskStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>שלב בפרויקט</Label>
                    <Select 
                      value={formData.phase || 'none'} 
                      onValueChange={(val) => setFormData({ ...formData, phase: val === 'none' ? null : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר שלב" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא שלב</SelectItem>
                        {PROJECT_PHASES.map((phase) => (
                          <SelectItem key={phase} value={phase}>
                            {phase}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>תאריכים מתוכננים</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">התחלה</Label>
                      <Input
                        type="date"
                        value={formData.planned_start_date || ''}
                        onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">סיום</Label>
                      <Input
                        type="date"
                        value={formData.planned_end_date || ''}
                        onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>תאריכים בפועל</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">התחלה</Label>
                      <Input
                        type="date"
                        value={formData.actual_start_date || ''}
                        onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">סיום</Label>
                      <Input
                        type="date"
                        value={formData.actual_end_date || ''}
                        onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {projectAdvisors.length > 0 && (
                  <div className="space-y-2">
                    <Label>שיוך ליועץ</Label>
                    <TaskAssignment
                      value={formData.assigned_advisor_id}
                      onChange={(id) => setFormData({ ...formData, assigned_advisor_id: id })}
                      projectAdvisors={projectAdvisors}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>התקדמות</Label>
                    <span className="text-sm text-muted-foreground">{formData.progress_percent || 0}%</span>
                  </div>
                  <Slider
                    value={[formData.progress_percent || 0]}
                    onValueChange={([val]) => setFormData({ ...formData, progress_percent: val })}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit_is_milestone"
                    checked={formData.is_milestone || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_milestone: !!checked })}
                  />
                  <Label htmlFor="edit_is_milestone" className="cursor-pointer">
                    אבן דרך
                  </Label>
                </div>

                {/* Task Dependencies */}
                <div className="space-y-2">
                  <Label>תלויות (משימות שחייבות להסתיים לפני)</Label>
                  <TaskDependencySelector
                    dependencies={dependencies}
                    availableTasks={allProjectTasks}
                    currentTaskId={task.id}
                    onAdd={addDependency}
                    onRemove={removeDependency}
                    loading={depsLoading}
                    hasUnfinishedDependencies={hasUnfinishedDependencies}
                  />
                </div>

                {formData.status === 'blocked' && (
                  <div className="space-y-2">
                    <Label htmlFor="block_reason">סיבת החסימה</Label>
                    <Textarea
                      id="block_reason"
                      value={formData.block_reason || ''}
                      onChange={(e) => setFormData({ ...formData, block_reason: e.target.value })}
                      placeholder="מה חוסם את המשימה?"
                      rows={2}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">הערות</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    ביטול
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !formData.name?.trim()}>
                    {isSubmitting ? 'שומר...' : 'שמור שינויים'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files">
              <TaskFilesSection taskId={task.id} />
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments">
              <TaskCommentsSection taskId={task.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dependency block alert */}
      <AlertDialog open={showDepBlockAlert} onOpenChange={setShowDepBlockAlert}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>לא ניתן לסמן כ"הושלם"</AlertDialogTitle>
            <AlertDialogDescription>
              משימה זו תלויה במשימות שטרם הושלמו:
              <ul className="mt-2 list-disc list-inside space-y-1">
                {unfinishedDependencies.map(d => (
                  <li key={d.id}>{d.blocking_task?.name}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDepBlockAlert(false)}>
              הבנתי
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
