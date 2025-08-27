import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  type: string;
  location: string;
  budget: number;
  advisors_budget: number | null;
  description: string | null;
  phase: string;
}

interface EditProjectDialogProps {
  project: Project;
  onProjectUpdate: (updatedProject: Project) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const projectTypes = [
  'בניין מגורים',
  'בניין משרדים',
  'תשתיות',
  'שיפוץ ושדרוג'
];

const phases = [
  'תכנון ראשוני',
  'אישורים',
  'ביצוע',
  'גמר',
  'הושלם'
];

export const EditProjectDialog = ({ project, onProjectUpdate, open: controlledOpen, onOpenChange }: EditProjectDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    type: project.type,
    location: project.location,
    budget: project.budget.toString(),
    advisors_budget: project.advisors_budget?.toString() || '',
    description: project.description || '',
    phase: project.phase
  });
  const { toast } = useToast();

  // Use controlled or internal open state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleSave = async () => {
    setLoading(true);
    try {
      const computedName = formData.name.trim() || formData.location.trim();
      const updateData = {
        name: computedName,
        type: formData.type,
        location: formData.location,
        budget: parseFloat(formData.budget),
        advisors_budget: formData.advisors_budget ? parseFloat(formData.advisors_budget) : null,
        description: formData.description || null,
        phase: formData.phase
      };

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', project.id);

      if (error) throw error;

      onProjectUpdate({ ...project, ...updateData });
      setIsOpen(false);
      
      toast({
        title: "נשמר בהצלחה",
        description: "פרטי הפרויקט עודכנו",
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את הפרויקט",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          עריכת פרויקט
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת פרטי פרויקט</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">שם הפרויקט</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="type">סוג פרויקט</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {projectTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="phase">שלב הפרויקט</Label>
            <Select value={formData.phase} onValueChange={(value) => setFormData(prev => ({ ...prev, phase: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {phases.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">מיקום</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="budget">תקציב פרויקט (₪)</Label>
            <Input
              id="budget"
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="advisors_budget">תקציב יועצים (₪)</Label>
            <Input
              id="advisors_budget"
              type="number"
              value={formData.advisors_budget}
              onChange={(e) => setFormData(prev => ({ ...prev, advisors_budget: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {loading ? 'שומר...' : 'שמירה'}
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};