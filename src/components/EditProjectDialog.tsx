import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Edit, Save, AlertCircle, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/types/project';
import { PROJECT_PHASES } from '@/constants/project';
import { ProjectTypeSelector } from '@/components/ProjectTypeSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    phase: project.phase || ''
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
      <DialogContent className="max-w-2xl max-h-[85vh] p-0" dir="rtl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>עריכת פרטי פרויקט</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(85vh-120px)] px-6">
          <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">שם הפרויקט</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={formData.location || 'הכנס שם פרויקט'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              אם יישאר ריק, נשתמש במיקום בתור שם הפרויקט
            </p>
          </div>

          <div>
            <Label htmlFor="type">סוג פרויקט</Label>
            <ProjectTypeSelector
              selectedType={formData.type}
              onTypeChange={(type) => setFormData(prev => ({ ...prev, type }))}
              placeholder="בחר סוג פרויקט"
              showLegacyWarning={true}
            />
          </div>

          <div>
            <Label htmlFor="phase">שלב הפרויקט</Label>
            <Select value={formData.phase} onValueChange={(value) => setFormData(prev => ({ ...prev, phase: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PROJECT_PHASES.map((phase) => (
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="advisors_budget">תקציב יועצים</Label>
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
                <div className="flex items-center gap-3">
                  <Slider
                    value={[advisorBudgetPercentage]}
                    onValueChange={(values) => setAdvisorBudgetPercentage(values[0])}
                    min={0}
                    max={30}
                    step={1}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 min-w-[60px] justify-end">
                    <span className="font-semibold">{advisorBudgetPercentage}%</span>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
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
                />
                {formData.budget && formData.advisors_budget && (
                  <div className="text-sm text-muted-foreground">
                    {currentPercentage.toFixed(1)}% מתקציב הפרויקט
                  </div>
                )}
              </div>
            )}

            <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
              💡 תקציב יועצים טיפוסי: 5-15% מתקציב הפרויקט
            </div>

            {showBudgetWarning && (
              <Alert className="border-yellow-500">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  תקציב היועצים גבוה מ-30% מתקציב הפרויקט. האם זה נכון?
                </AlertDescription>
              </Alert>
            )}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};