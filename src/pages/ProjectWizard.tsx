import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress"
import { supabase } from '@/integrations/supabase/client';
import { useAdvisorsValidation } from '@/hooks/useAdvisorsValidation';

interface FormData {
  projectName: string;
  projectType: string;
  location: string;
  budget: string;
  advisorsBudget: string;
  description: string;
}

export const ProjectWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    projectName: '',
    projectType: '',
    location: '',
    budget: '',
    advisorsBudget: '',
    description: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const totalSteps = 3;
  const { getCanonicalProjectTypes } = useAdvisorsValidation();

  // Get canonical project types with fallback
  const projectTypes = getCanonicalProjectTypes().length > 0 
    ? getCanonicalProjectTypes()
    : ["בניין מגורים", "בניין משרדים", "תשתיות", "שיפוץ ושדרוג"];

  // Persist wizard state in localStorage
  const DRAFT_KEY = 'project-wizard-draft';

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();

    // Restore draft from localStorage
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const { currentStep: savedStep, formData: savedFormData } = JSON.parse(savedDraft);
        setCurrentStep(savedStep || 1);
        setFormData(prev => ({ ...prev, ...savedFormData }));
      } catch (error) {
        console.error('Error restoring draft:', error);
      }
    }
  }, []);

  // Save draft to localStorage whenever formData or currentStep changes
  useEffect(() => {
    const draftData = { currentStep, formData };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  }, [currentStep, formData]);

  const createProjectInternal = async () => {
    if (!user) return null;

    setCreating(true);
    try {
      // Validate and safely parse budget
      const budget = Number(formData.budget);
      if (!formData.budget || isNaN(budget)) {
        toast({
          title: "שגיאה בתקציב",
          description: "אנא הכנס תקציב פרויקט תקין",
          variant: "destructive",
        });
        setCreating(false);
        return null;
      }

      const advisorsBudget = formData.advisorsBudget ? Number(formData.advisorsBudget) : null;
      if (formData.advisorsBudget && isNaN(advisorsBudget!)) {
        toast({
          title: "שגיאה בתקציב יועצים",
          description: "אנא הכנס תקציב יועצים תקין או השאר ריק",
          variant: "destructive",
        });
        setCreating(false);
        return null;
      }

      // Set default timeline values (today and 1 year from today)
      const today = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(today.getFullYear() + 1);

      const projectData = {
        name: formData.projectName,
        type: formData.projectType,
        location: formData.location,
        budget,
        advisors_budget: advisorsBudget,
        description: formData.description || null,
        owner_id: user.id,
        status: 'draft', // Set to draft status
        timeline_start: today.toISOString().split('T')[0], // Format as YYYY-MM-DD
        timeline_end: oneYearFromNow.toISOString().split('T')[0] // Format as YYYY-MM-DD
      };

      const { data: project, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (error) throw error;

      // Upload files if any and create project_files records
      if (uploadedFiles.length > 0) {
        setUploading(true);
        for (const file of uploadedFiles) {
          try {
            const fileName = `${project.id}/${Date.now()}-${encodeURIComponent(file.name)}`;
            
            const { error: uploadError } = await supabase.storage
              .from('project-files')
              .upload(fileName, file, { upsert: true });

            if (uploadError) {
              toast({
                title: "שגיאה בהעלאת קובץ",
                description: `לא ניתן להעלות את הקובץ ${file.name}`,
                variant: "destructive",
              });
              continue;
            }

            // Create project_files record
            const { error: dbError } = await supabase
              .from('project_files')
              .insert({
                project_id: project.id,
                file_name: file.name,
                file_type: file.type || 'application/octet-stream',
                file_url: fileName,
                size_mb: Math.round((file.size / 1_000_000) * 100) / 100,
              });

            if (dbError) {
              console.error('Error creating project_files record:', dbError);
            }
          } catch (fileError) {
            console.error('File processing error:', fileError);
            toast({
              title: "שגיאה בעיבוד קובץ",
              description: `לא ניתן לעבד את הקובץ ${file.name}`,
              variant: "destructive",
            });
          }
        }
        setUploading(false);
      }

      // Clear localStorage draft
      localStorage.removeItem(DRAFT_KEY);

      toast({
        title: "פרויקט נוצר בהצלחה!",
        description: `הפרויקט "${project.name}" נוצר בהצלחה`,
      });

      return project;

    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "שגיאה ביצירת פרויקט",
        description: "אירעה שגיאה ביצירת הפרויקט. אנא נסה שוב.",
        variant: "destructive",
      });
      return null;
    } finally {
      setCreating(false);
    }
  };

  const createAndGoToAdvisors = async () => {
    const project = await createProjectInternal();
    if (project) {
      navigate(`/projects/${project.id}`);
    }
  };

  const createAndFinish = async () => {
    const project = await createProjectInternal();
    if (project) {
      navigate('/dashboard');
    }
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      toast({
        title: "יש למלא את כל השדות",
        description: "אנא מלא את כל השדות הנדרשים בשלב זה.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isStepValid = (step: number): boolean => {
    if (step === 1) {
      return !!formData.projectName && !!formData.projectType && !!formData.location;
    }
    if (step === 2) {
      return !!formData.budget;
    }
    return true;
  };

  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">פרטי הפרויקט</h2>
            <p className="text-muted-foreground mb-6">
              הזן את הפרטים הבסיסיים של הפרויקט שלך
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="projectName">שם הפרויקט</Label>
              <Input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="projectType">סוג פרויקט</Label>
              <Select onValueChange={(value) => handleSelectChange('projectType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">מיקום</Label>
              <Input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">תקציב ותיאור</h2>
            <p className="text-muted-foreground mb-6">
              הגדר את התקציב ותיאור הפרויקט
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="budget">תקציב הפרויקט</Label>
              <Input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="הכנס את תקציב הפרויקט"
              />
            </div>
            <div>
              <Label htmlFor="advisorsBudget">תקציב יועצים (אופציונלי)</Label>
              <Input
                type="number"
                id="advisorsBudget"
                name="advisorsBudget"
                value={formData.advisorsBudget}
                onChange={handleChange}
                placeholder="הכנס את תקציב היועצים"
              />
            </div>
            <div>
              <Label htmlFor="description">תיאור הפרויקט (אופציונלי)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="הכנס תיאור מפורט של הפרויקט"
              />
            </div>
            <div>
              <Label htmlFor="files">קבצים (אופציונלי)</Label>
              <Input
                type="file"
                id="files"
                multiple
                onChange={handleFileChange}
              />
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">קבצים שנבחרו:</p>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1_000_000).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">סקירה ואישור</h2>
            <p className="text-muted-foreground mb-6">
              בדוק את פרטי הפרויקט לפני יצירתו
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>פרטי הפרויקט</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">שם הפרויקט</label>
                    <p className="font-medium">{formData.projectName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">סוג פרויקט</label>
                    <p className="font-medium">{formData.projectType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">מיקום</label>
                    <p className="font-medium">{formData.location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">תקציב פרויקט</label>
                    <p className="font-medium">{formData.budget ? `₪${parseInt(formData.budget).toLocaleString()}` : 'לא הוגדר'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">תקציב יועצים</label>
                    <p className="font-medium">{formData.advisorsBudget ? `₪${parseInt(formData.advisorsBudget).toLocaleString()}` : 'לא הוגדר'}</p>
                  </div>
                </div>
                {formData.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">תיאור</label>
                    <p className="font-medium">{formData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {uploadedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>קבצים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1_000_000).toFixed(2)} MB)
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-4">
            יצירת פרויקט חדש
          </h1>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          <div className="mt-2 text-center text-muted-foreground text-sm">
            שלב {currentStep} מתוך {totalSteps}
          </div>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8">
            {renderStep()}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4 ml-2 flip-rtl-180" />
                  הקודם
                </Button>
              ) : (
                <div />
              )}

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid(currentStep)}
                  className="flex items-center gap-2"
                >
                  הבא
                  <ArrowRight className="w-4 h-4 mr-2" />
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={createAndFinish}
                    disabled={creating || uploading}
                    className="flex items-center gap-2"
                  >
                    {creating || uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {uploading ? 'מעלה קבצים...' : 'יוצר פרויקט...'}
                      </>
                    ) : (
                      'צור וסיים'
                    )}
                  </Button>
                  <Button
                    onClick={createAndGoToAdvisors}
                    disabled={creating || uploading}
                    className="flex items-center gap-2"
                  >
                    {creating || uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {uploading ? 'מעלה קבצים...' : 'יוצר פרויקט...'}
                      </>
                    ) : (
                      'צור ועבור לאיתור יועצים'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
