import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskAssignment } from './TaskAssignment';
import { PROJECT_PHASES } from '@/constants/project';
import type { ProjectTask, ProjectAdvisorOption } from '@/types/task';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Partial<ProjectTask>) => Promise<any>;
  projectAdvisors: ProjectAdvisorOption[];
}

export function CreateTaskDialog({ open, onOpenChange, onSubmit, projectAdvisors }: CreateTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoMatched, setAutoMatched] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phase: '',
    planned_start_date: '',
    planned_end_date: '',
    assigned_advisor_id: null as string | null,
    is_milestone: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit({
        name: formData.name,
        description: formData.description || undefined,
        phase: formData.phase || undefined,
        planned_start_date: formData.planned_start_date || undefined,
        planned_end_date: formData.planned_end_date || undefined,
        assigned_advisor_id: formData.assigned_advisor_id || undefined,
        is_milestone: formData.is_milestone,
      });

      if (result) {
        setFormData({
          name: '',
          description: '',
          phase: '',
          planned_start_date: '',
          planned_end_date: '',
          assigned_advisor_id: null,
          is_milestone: false,
        });
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוספת משימה חדשה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם המשימה *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="הזן שם משימה"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="תיאור המשימה (אופציונלי)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>שלב בפרויקט / תחום</Label>
            <Select 
              value={formData.phase} 
              onValueChange={(val) => {
                let matchedAdvisorId: string | null = null;
                // Auto-select matching advisor by expertise
                if (val && projectAdvisors.length > 0) {
                  const match = projectAdvisors.find((pa: any) => 
                    pa.expertise?.includes(val)
                  );
                  if (match) {
                    matchedAdvisorId = match.advisor_id;
                    setAutoMatched(true);
                  } else {
                    setAutoMatched(false);
                  }
                } else {
                  setAutoMatched(false);
                }
                setFormData(prev => ({ 
                  ...prev, 
                  phase: val, 
                  ...(matchedAdvisorId ? { assigned_advisor_id: matchedAdvisorId } : {})
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר שלב" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">תאריך התחלה</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.planned_start_date}
                onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">תאריך סיום</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.planned_end_date}
                onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
              />
            </div>
          </div>

          {projectAdvisors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>שיוך ליועץ</Label>
                {autoMatched && formData.assigned_advisor_id && (
                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    ⚡ שויך אוטומטית לפי התמחות
                  </span>
                )}
              </div>
              <TaskAssignment
                value={formData.assigned_advisor_id}
                onChange={(id) => { setFormData({ ...formData, assigned_advisor_id: id }); setAutoMatched(false); }}
                projectAdvisors={projectAdvisors}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_milestone"
              checked={formData.is_milestone}
              onCheckedChange={(checked) => setFormData({ ...formData, is_milestone: !!checked })}
            />
            <Label htmlFor="is_milestone" className="cursor-pointer">
              סמן כאבן דרך
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? 'יוצר...' : 'צור משימה'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
