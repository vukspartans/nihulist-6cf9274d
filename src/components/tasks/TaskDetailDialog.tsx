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
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TaskAssignment } from './TaskAssignment';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskDependencySelector } from './TaskDependencySelector';
import { TaskCommentsSection } from './TaskCommentsSection';
import { TaskFilesSection } from './TaskFilesSection';
import { useTaskDependencies } from '@/hooks/useTaskDependencies';
import { useTaskComments } from '@/hooks/useTaskComments';
import { useTaskChangeRequests } from '@/hooks/useTaskChangeRequests';
import { useAuth } from '@/hooks/useAuth';
import { PROJECT_PHASES } from '@/constants/project';
import { FileText, MessageSquare, Settings, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ProjectTask, TaskStatus, ProjectAdvisorOption } from '@/types/task';

interface TaskDetailDialogProps {
  task: ProjectTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (taskId: string, updates: Partial<ProjectTask>) => Promise<boolean>;
  onDelete?: (taskId: string) => Promise<boolean>;
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

export function TaskDetailDialog({ task, open, onOpenChange, onSubmit, onDelete, projectAdvisors, allProjectTasks = [] }: TaskDetailDialogProps) {
  const { user, hasRole } = useAuth();
  const isAdvisor = hasRole('advisor') && !hasRole('entrepreneur') && !hasRole('admin');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ProjectTask>>({});
  const [showDepBlockAlert, setShowDepBlockAlert] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { submitChangeRequest } = useTaskChangeRequests(task?.project_id || null);

  const {
    dependencies,
    loading: depsLoading,
    addDependency,
    removeDependency,
    hasUnfinishedDependencies,
    unfinishedDependencies,
  } = useTaskDependencies(task?.id || null);

  const { comments } = useTaskComments(task?.id || null);
  const commentCount = comments.length;

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
      // Advisor flow: submit as change request instead of direct save
      if (isAdvisor && user) {
        const success = await submitChangeRequest(task.id, formData, user.id);
        if (success) {
          onOpenChange(false);
        }
      } else {
        const success = await onSubmit(task.id, formData);
        if (success) {
          onOpenChange(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    setIsSubmitting(true);
    try {
      const success = await onDelete(task.id);
      if (success) {
        setShowDeleteConfirm(false);
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  const isCompleteAndCritical = task.status === 'completed' && task.is_payment_critical;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl !h-[85vh] flex flex-col p-0" dir="rtl">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <DialogTitle>פרטי משימה</DialogTitle>
              <TaskStatusBadge status={task.status} />
              {task.is_payment_critical && (
                <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded">
                  קריטי לתשלום
                </span>
              )}
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full grid grid-cols-3 mx-5 mt-1" dir="rtl" style={{ width: 'calc(100% - 40px)' }}>
              <TabsTrigger value="details" className="gap-1.5 text-xs">
                <Settings className="h-3.5 w-3.5" />
                פרטים
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                תגובות
                {commentCount > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                    {commentCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                קבצים
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <form onSubmit={handleSubmit} className="space-y-2.5 px-5 py-3">
                  {/* Invoice ready alert */}
                  {isCompleteAndCritical && (
                    <Alert className="border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-400 text-xs">
                        אבן הדרך הושלמה – ניתן להגיש חשבון עבור יועץ זה.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Advisor notice */}
                  {isAdvisor && (
                    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                      <AlertDescription className="text-blue-700 dark:text-blue-400 text-xs">
                        שינויים שתבצע יישלחו לאישור היזם לפני שמירתם.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Name */}
                  <div className="space-y-1">
                    <Label htmlFor="edit_name" className="text-xs text-right block">שם המשימה *</Label>
                    <Input
                      id="edit_name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="text-right"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <Label htmlFor="edit_description" className="text-xs text-right block">תיאור</Label>
                    <Textarea
                      id="edit_description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>

                  {/* Status + Phase + Assignment in one row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-right block">סטטוס</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(val) => handleStatusChange(val as TaskStatus)}
                        dir="rtl"
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-right block">שלב</Label>
                      <Select
                        value={formData.phase || 'none'}
                        onValueChange={(val) => setFormData({ ...formData, phase: val === 'none' ? null : val })}
                        dir="rtl"
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue placeholder="בחר שלב" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="none">ללא שלב</SelectItem>
                          {PROJECT_PHASES.map((phase) => (
                            <SelectItem key={phase} value={phase}>
                              {phase}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {projectAdvisors.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-right block">שיוך ליועץ</Label>
                        <TaskAssignment
                          value={formData.assigned_advisor_id}
                          onChange={(id) => setFormData({ ...formData, assigned_advisor_id: id })}
                          projectAdvisors={projectAdvisors}
                        />
                      </div>
                    )}
                  </div>

                  {/* Dates - 2x2 grid */}
                  <div className="space-y-1.5 rounded-md bg-muted/30 p-2.5">
                    <Label className="text-xs text-right block font-medium">תאריכים</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground text-right block">תחילה מתוכננת</Label>
                        <Input
                          type="date"
                          value={formData.planned_start_date || ''}
                          onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                          className="text-xs h-9"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground text-right block">סיום מתוכנן</Label>
                        <Input
                          type="date"
                          value={formData.planned_end_date || ''}
                          onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                          className="text-xs h-9"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground text-right block">תחילה בפועל</Label>
                        <Input
                          type="date"
                          value={formData.actual_start_date || ''}
                          onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                          className="text-xs h-9"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground text-right block">סיום בפועל</Label>
                        <Input
                          type="date"
                          value={formData.actual_end_date || ''}
                          onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                          className="text-xs h-9"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Progress + Milestone */}
                  <div className="space-y-2 rounded-md bg-muted/30 p-2.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-right font-medium">התקדמות</Label>
                        <span className={`text-xs font-semibold ${
                          (formData.progress_percent || 0) >= 70 ? 'text-green-600' :
                          (formData.progress_percent || 0) >= 30 ? 'text-orange-500' :
                          'text-red-500'
                        }`} dir="ltr">{formData.progress_percent || 0}%</span>
                      </div>
                      <div dir="ltr">
                        <Slider
                          value={[formData.progress_percent || 0]}
                          onValueChange={([val]) => setFormData({ ...formData, progress_percent: val })}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                      <Checkbox
                        id="edit_is_milestone"
                        checked={formData.is_milestone || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_milestone: !!checked })}
                      />
                      <Label htmlFor="edit_is_milestone" className="cursor-pointer text-xs whitespace-nowrap">
                        אבן דרך
                      </Label>
                    </div>
                  </div>

                  {/* Dependencies */}
                  <div className="space-y-1">
                    <Label className="text-xs text-right block">תלויות</Label>
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

                  {/* Block reason (conditional) */}
                  {formData.status === 'blocked' && (
                    <div className="space-y-1">
                      <Label htmlFor="block_reason" className="text-xs text-right block">סיבת החסימה</Label>
                      <Textarea
                        id="block_reason"
                        value={formData.block_reason || ''}
                        onChange={(e) => setFormData({ ...formData, block_reason: e.target.value })}
                        placeholder="מה חוסם את המשימה?"
                        rows={2}
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-1">
                    <Label htmlFor="notes" className="text-xs text-right block">הערות</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>

                  {/* Footer inside the form */}
                  <DialogFooter className="flex gap-2 pt-3 mt-1 border-t justify-between">
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isSubmitting || !formData.name?.trim()}>
                        {isSubmitting ? 'שומר...' : isAdvisor ? 'שלח לאישור' : 'שמור שינויים'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        ביטול
                      </Button>
                    </div>
                    {onDelete && !isAdvisor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        מחק
                      </Button>
                    )}
                  </DialogFooter>
                </form>
              </ScrollArea>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="flex-1 min-h-0 px-5 py-3">
              <TaskCommentsSection taskId={task.id} />
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="flex-1 min-h-0 px-5 py-3">
              <TaskFilesSection taskId={task.id} />
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

      {/* Delete confirmation alert */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {task?.is_payment_critical && <AlertTriangle className="w-5 h-5 text-destructive" />}
              {task?.is_payment_critical ? 'מחיקת משימה קריטית לתשלום' : 'מחיקת משימה'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {task?.is_payment_critical
                ? `משימה זו מקושרת לאבן דרך תשלום. מחיקתה תשפיע על חישוב הצפי התזרימי. האם אתה בטוח שברצונך למחוק את "${task?.name}"?`
                : `האם אתה בטוח שברצונך למחוק את המשימה "${task?.name}"?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
