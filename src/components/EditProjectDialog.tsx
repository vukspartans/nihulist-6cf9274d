import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit, Save, AlertCircle, Percent, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/types/project';
import { PROJECT_PHASES } from '@/constants/project';
import { ProjectTypeSelector } from '@/components/ProjectTypeSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EditProjectDialogProps {
  project: Project;
  onProjectUpdate: (updatedProject: Project) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const EditProjectDialog = ({ project, onProjectUpdate, open: controlledOpen, onOpenChange }: EditProjectDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [budgetMode, setBudgetMode] = useState<'percentage' | 'direct'>('direct');
  const [advisorBudgetPercentage, setAdvisorBudgetPercentage] = useState(10);
  const [formData, setFormData] = useState({
    name: project.name,
    type: project.type || '',
    location: project.location || '',
    budget: project.budget?.toString() || '',
    advisors_budget: project.advisors_budget?.toString() || '',
    description: project.description || '',
    phase: project.phase || '',
    timeline_start: project.timeline_start ? new Date(project.timeline_start) : undefined,
    timeline_end: project.timeline_end ? new Date(project.timeline_end) : undefined,
  });
  const { toast } = useToast();

  // Calculate advisor budget based on mode
  const calculatedAdvisorBudget = useMemo(() => {
    if (budgetMode === 'percentage' && formData.budget) {
      return (parseFloat(formData.budget) * advisorBudgetPercentage) / 100;
    }
    return parseFloat(formData.advisors_budget) || 0;
  }, [budgetMode, formData.budget, advisorBudgetPercentage, formData.advisors_budget]);

  // Calculate percentage even in direct mode for display
  const currentPercentage = useMemo(() => {
    const budget = parseFloat(formData.budget) || 0;
    const advisorBudget = budgetMode === 'percentage' ? calculatedAdvisorBudget : parseFloat(formData.advisors_budget) || 0;
    if (budget === 0) return 0;
    return (advisorBudget / budget) * 100;
  }, [formData.budget, formData.advisors_budget, budgetMode, calculatedAdvisorBudget]);

  // Warning if percentage is too high
  const showBudgetWarning = currentPercentage > 30;

  // Use controlled or internal open state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleSave = async () => {
    setLoading(true);
    try {
      const computedName = formData.name.trim() || formData.location.trim() || 'פרויקט ללא שם';
      
      // Use calculated budget if in percentage mode
      const finalAdvisorBudget = budgetMode === 'percentage' 
        ? calculatedAdvisorBudget 
        : (formData.advisors_budget ? parseFloat(formData.advisors_budget) : null);

      const updateData = {
        name: computedName,
        type: formData.type,
        location: formData.location,
        budget: parseFloat(formData.budget) || 0,
        advisors_budget: finalAdvisorBudget,
        description: formData.description || null,
        phase: formData.phase,
        timeline_start: formData.timeline_start?.toISOString() || project.timeline_start,
        timeline_end: formData.timeline_end?.toISOString() || project.timeline_end,
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
      <DialogTrigger asChild data-project-edit-trigger>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          עריכת פרויקט
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0" dir="rtl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-right">עריכת פרטי פרויקט</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="space-y-6 py-4" dir="rtl">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-right block">שם הפרויקט</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={formData.location || 'הכנס שם פרויקט'}
              className="text-right"
              dir="rtl"
            />
            <p className="text-xs text-muted-foreground text-right">
              אם יישאר ריק, נשתמש במיקום בתור שם הפרויקט
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-right block">סוג פרויקט</Label>
            <ProjectTypeSelector
              selectedType={formData.type}
              onTypeChange={(type) => setFormData(prev => ({ ...prev, type }))}
              placeholder="בחר סוג פרויקט"
              showLegacyWarning={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phase" className="text-right block">שלב הפרויקט</Label>
            <Select value={formData.phase} onValueChange={(value) => setFormData(prev => ({ ...prev, phase: value }))}>
              <SelectTrigger className="text-right" dir="rtl">
                <SelectValue placeholder="בחר שלב" />
              </SelectTrigger>
              <SelectContent align="end" dir="rtl">
                {PROJECT_PHASES.map((phase) => (
                  <SelectItem key={phase} value={phase} className="text-right">
                    {phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-right block">מיקום</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="text-right"
              dir="rtl"
              placeholder="עיר, אזור"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-right block">תאריך התחלה</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right font-normal",
                      !formData.timeline_start && "text-muted-foreground"
                    )}
                    dir="rtl"
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {formData.timeline_start ? (
                      format(formData.timeline_start, "PPP", { locale: he })
                    ) : (
                      <span>בחר תאריך</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.timeline_start}
                    onSelect={(date) => setFormData(prev => ({ ...prev, timeline_start: date }))}
                    initialFocus
                    className="pointer-events-auto"
                    dir="rtl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-right block">תאריך סיום</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right font-normal",
                      !formData.timeline_end && "text-muted-foreground"
                    )}
                    dir="rtl"
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {formData.timeline_end ? (
                      format(formData.timeline_end, "PPP", { locale: he })
                    ) : (
                      <span>בחר תאריך</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.timeline_end}
                    onSelect={(date) => setFormData(prev => ({ ...prev, timeline_end: date }))}
                    disabled={(date) => formData.timeline_start ? date < formData.timeline_start : false}
                    initialFocus
                    className="pointer-events-auto"
                    dir="rtl"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="text-right block">תקציב פרויקט (₪)</Label>
            <Input
              id="budget"
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
              className="text-right"
              dir="rtl"
              placeholder="0"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="advisors_budget" className="text-right">תקציב יועצים</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {budgetMode === 'percentage' ? 'אחוז' : 'סכום ישיר'}
                </span>
                <Switch
                  checked={budgetMode === 'percentage'}
                  onCheckedChange={(checked) => setBudgetMode(checked ? 'percentage' : 'direct')}
                />
              </div>
            </div>

            {budgetMode === 'percentage' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3" dir="ltr">
                  <div className="flex items-center gap-1 min-w-[60px]">
                    <span className="font-semibold">{advisorBudgetPercentage}%</span>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Slider
                    value={[advisorBudgetPercentage]}
                    onValueChange={(values) => setAdvisorBudgetPercentage(values[0])}
                    min={0}
                    max={30}
                    step={1}
                    className="flex-1"
                  />
                </div>
                <div className="text-sm text-muted-foreground text-right" dir="rtl">
                  {advisorBudgetPercentage}% מתקציב = ₪{calculatedAdvisorBudget.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="advisors_budget"
                  type="number"
                  value={formData.advisors_budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, advisors_budget: e.target.value }))}
                  placeholder="הזן סכום ישיר"
                  className="text-right"
                  dir="rtl"
                />
                {formData.budget && formData.advisors_budget && (
                  <div className="text-sm text-muted-foreground text-right" dir="rtl">
                    {currentPercentage.toFixed(1)}% מתקציב הפרויקט
                  </div>
                )}
              </div>
            )}

            <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground text-right" dir="rtl">
              💡 תקציב יועצים טיפוסי: 5-15% מתקציב הפרויקט
            </div>

            {showBudgetWarning && (
              <Alert className="border-yellow-500">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs text-right" dir="rtl">
                  תקציב היועצים גבוה מ-30% מתקציב הפרויקט. האם זה נכון?
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-right block">תיאור</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="text-right resize-none"
              dir="rtl"
              placeholder="פרטים נוספים על הפרויקט..."
            />
          </div>
        </div>
        </ScrollArea>
        
        <DialogFooter className="p-6 pt-0">
          <div className="flex gap-2 w-full justify-start">
            <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {loading ? 'שומר...' : 'שמירה'}
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              ביטול
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};