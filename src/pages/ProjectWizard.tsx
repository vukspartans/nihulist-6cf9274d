import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ArrowLeft, ArrowRight, Loader2, X, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress"
import { supabase } from '@/integrations/supabase/client';
import { useAdvisorsValidation } from '@/hooks/useAdvisorsValidation';
import { PROJECT_PHASES } from '@/constants/project';

interface FormData {
  address: string;
  projectName: string;
  projectType: string;
  phase: string;
  budget: string;
  advisorsBudget: string;
  description: string;
}

interface FileWithMetadata {
  file: File;
  customName: string;
  description: string;
}

export const ProjectWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    address: '',
    projectName: '',
    projectType: '',
    phase: '',
    budget: '',
    advisorsBudget: '',
    description: '',
  });
  const [filesWithMetadata, setFilesWithMetadata] = useState<FileWithMetadata[]>([]);
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
      // Validate and safely parse budget (remove commas for parsing)
      const budget = Number(formData.budget.replace(/,/g, ''));
      if (!formData.budget || isNaN(budget)) {
        toast({
          title: "שגיאה בתקציב",
          description: "אנא הכנס תקציב פרויקט תקין",
          variant: "destructive",
        });
        setCreating(false);
        return null;
      }

      const advisorsBudget = formData.advisorsBudget ? Number(formData.advisorsBudget.replace(/,/g, '')) : null;
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
        name: formData.projectName.trim() || formData.address.trim(),
        type: formData.projectType,
        phase: formData.phase,
        location: formData.address,
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
      if (filesWithMetadata.length > 0) {
        setUploading(true);
        for (const fileWithMeta of filesWithMetadata) {
          try {
            const fileName = `${project.id}/${Date.now()}-${encodeURIComponent(fileWithMeta.file.name)}`;
            
            const { error: uploadError } = await supabase.storage
              .from('project-files')
              .upload(fileName, fileWithMeta.file, { upsert: true });

            if (uploadError) {
              toast({
                title: "שגיאה בהעלאת קובץ",
                description: `לא ניתן להעלות את הקובץ ${fileWithMeta.file.name}`,
                variant: "destructive",
              });
              continue;
            }

            // Create project_files record
            const { error: dbError } = await supabase
              .from('project_files')
              .insert({
                project_id: project.id,
                file_name: fileWithMeta.file.name,
                custom_name: fileWithMeta.customName || fileWithMeta.file.name,
                description: fileWithMeta.description || null,
                file_type: fileWithMeta.file.type || 'application/octet-stream',
                file_url: fileName,
                size_mb: Math.round((fileWithMeta.file.size / 1_000_000) * 100) / 100,
              });

            if (dbError) {
              console.error('Error creating project_files record:', dbError);
            }
          } catch (fileError) {
            console.error('File processing error:', fileError);
            toast({
              title: "שגיאה בעיבוד קובץ",
              description: `לא ניתן לעבד את הקובץ ${fileWithMeta.file.name}`,
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
    
    // Format budget fields with thousands separator
    if (name === 'budget' || name === 'advisorsBudget') {
      // Remove any non-digit characters except for existing commas
      const numericValue = value.replace(/[^\d]/g, '');
      // Add thousands separator
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFilesWithMeta = files.map(file => ({
      file,
      customName: file.name,
      description: ''
    }));
    setFilesWithMetadata(prev => [...prev, ...newFilesWithMeta]);
  };

  const removeFile = (index: number) => {
    setFilesWithMetadata(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileMetadata = (index: number, field: 'customName' | 'description', value: string) => {
    setFilesWithMetadata(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const isStepValid = (step: number): boolean => {
    if (step === 1) {
      return !!formData.address && !!formData.projectType && !!formData.phase && !!formData.budget;
    }
    return true;
  };

  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-3">פרטי הפרויקט</h2>
            <p className="text-muted-foreground text-lg">
              הזן את הפרטים הבסיסיים של הפרויקט שלך
            </p>
          </div>

          <div className="grid gap-6">
            {/* Address - Required */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-base font-medium">
                כתובת <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="הזן את כתובת הפרויקט"
                className="h-12"
              />
            </div>

            {/* Name - Optional */}
            <div className="space-y-2">
              <Label htmlFor="projectName" className="text-base font-medium">
                שם הפרויקט (אופציונלי)
              </Label>
              <Input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                placeholder={formData.address || "שם לפרויקט שלך"}
                className="h-12"
              />
              <p className="text-sm text-muted-foreground">
                אם יישאר ריק, נשתמש בכתובת בתור שם הפרויקט
              </p>
            </div>

            {/* Project Type - Required */}
            <div className="space-y-2">
              <Label htmlFor="projectType" className="text-base font-medium">
                סוג פרויקט <span className="text-destructive">*</span>
              </Label>
              <Select dir="rtl" onValueChange={(value) => handleSelectChange('projectType', value)}>
                <SelectTrigger className="h-12 text-right justify-end">
                  <SelectValue placeholder="בחר סוג פרויקט" className="text-right" />
                </SelectTrigger>
                <SelectContent dir="rtl" align="end" className="bg-background border shadow-lg z-50">
                  {projectTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-right justify-end">{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Phase - Required */}
            <div className="space-y-2">
              <Label htmlFor="phase" className="text-base font-medium">
                סטטוס הפרויקט <span className="text-destructive">*</span>
              </Label>
              <Select dir="rtl" onValueChange={(value) => handleSelectChange('phase', value)}>
                <SelectTrigger className="h-12 text-right justify-end">
                  <SelectValue placeholder="בחר סטטוס פרויקט" className="text-right" />
                </SelectTrigger>
                <SelectContent dir="rtl" align="end" className="bg-background border shadow-lg z-50">
                  {PROJECT_PHASES.map((phase) => (
                    <SelectItem key={phase} value={phase} className="text-right justify-end">{phase}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget - Required */}
            <div className="space-y-2">
              <Label htmlFor="budget" className="text-base font-medium">
                תקציב פרויקט <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="הכנס את תקציב הפרויקט"
                  className="h-12 pl-8"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₪</span>
              </div>
            </div>

            {/* Advisors Budget - Optional */}
            <div className="space-y-2">
              <Label htmlFor="advisorsBudget" className="text-base font-medium">
                תקציב יועצים (אופציונלי)
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  id="advisorsBudget"
                  name="advisorsBudget"
                  value={formData.advisorsBudget}
                  onChange={handleChange}
                  placeholder="הכנס את תקציב היועצים"
                  className="h-12 pl-8"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₪</span>
              </div>
            </div>

            {/* Description - Optional */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                תיאור נוסף (אופציונלי)
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="הכנס תיאור מפורט של הפרויקט"
                className="min-h-24"
              />
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-3">העלאת קבצים</h2>
            <p className="text-muted-foreground text-lg">
              העלה קבצים רלוונטיים לפרויקט שלך
            </p>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center bg-gradient-to-br from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all duration-300">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-6 group"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-foreground">לחץ כדי להעלות קבצים</p>
                  <p className="text-muted-foreground">או גרור ושחרר קבצים כאן</p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
                    <span className="px-3 py-1 bg-background rounded-full border">PDF</span>
                    <span className="px-3 py-1 bg-background rounded-full border">תמונות</span>
                    <span className="px-3 py-1 bg-background rounded-full border">מסמכים</span>
                  </div>
                </div>
              </label>
            </div>

            {filesWithMetadata.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <h3 className="font-semibold text-lg">קבצים שנבחרו ({filesWithMetadata.length})</h3>
                </div>
                <div className="grid gap-4">
                  {filesWithMetadata.map((fileWithMeta, index) => (
                    <div key={index} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{fileWithMeta.customName || fileWithMeta.file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(fileWithMeta.file.size / 1_000_000).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`customName-${index}`} className="text-sm font-medium">שם קובץ מותאם</Label>
                          <Input
                            id={`customName-${index}`}
                            value={fileWithMeta.customName}
                            onChange={(e) => updateFileMetadata(index, 'customName', e.target.value)}
                            placeholder="הכנס שם קובץ"
                            className="mt-2 h-10"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`description-${index}`} className="text-sm font-medium">תיאור</Label>
                          <Textarea
                            id={`description-${index}`}
                            value={fileWithMeta.description}
                            onChange={(e) => updateFileMetadata(index, 'description', e.target.value)}
                            placeholder="תיאור קצר של הקובץ"
                            className="mt-2 min-h-20"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-3">סקירה ואישור</h2>
            <p className="text-muted-foreground text-lg">
              בדוק את פרטי הפרויקט לפני יצירתו והצעדים הבאים
            </p>
          </div>

          <div className="space-y-6">
            {/* Project Summary */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">סיכום הפרויקט</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">כתובת</p>
                    <p className="text-base font-medium">{formData.address}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">שם הפרויקט</p>
                    <p className="text-base font-medium">{formData.projectName.trim() || formData.address.trim()}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">סוג פרויקט</p>
                    <p className="text-base font-medium">{formData.projectType}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">סטטוס הפרויקט</p>
                    <p className="text-base font-medium">{formData.phase}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">תקציב פרויקט</p>
                    <p className="text-base font-medium">
                      {formData.budget ? `₪${parseInt(formData.budget.replace(/,/g, '')).toLocaleString()}` : 'לא הוגדר'}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">תקציב יועצים</p>
                    <p className="text-base font-medium">
                      {formData.advisorsBudget ? `₪${parseInt(formData.advisorsBudget.replace(/,/g, '')).toLocaleString()}` : 'לא הוגדר'}
                    </p>
                  </div>
                </div>
                
                {formData.description && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground">תיאור נוסף</p>
                    <p className="text-base leading-relaxed">{formData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Files Summary */}
            {filesWithMetadata.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">קבצים ({filesWithMetadata.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filesWithMetadata.map((fileWithMeta, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        <FileText className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{fileWithMeta.customName}</p>
                          <p className="text-xs text-muted-foreground">{fileWithMeta.file.name}</p>
                          {fileWithMeta.description && (
                            <p className="text-xs text-muted-foreground mt-1">{fileWithMeta.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {(fileWithMeta.file.size / 1_000_000).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            <Card className="shadow-sm border-primary/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  הצעדים הבאים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                    <p>המערכת תיצור את הפרויקט ותשמור את כל הפרטים</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                    <p>תוכל לבחור לעבור ישירות לאיתור יועצים או לחזור ללוח הבקרה</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                    <p>הפרויקט יישמר במצב טיוטה עד להפעלתו המלאה</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5" dir="rtl">
      {/* Top navigation */}
      <div className="container mx-auto px-4 pt-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Home className="w-4 h-4" />
          חזרה ללוח הבקרה
        </Button>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-center mb-6">
            יצירת פרויקט חדש
          </h1>
          <Progress value={(currentStep / totalSteps) * 100} className="h-3 max-w-md mx-auto" />
          <div className="mt-4 text-center text-muted-foreground">
            שלב {currentStep} מתוך {totalSteps}
          </div>
        </div>

        <Card className="max-w-5xl mx-auto shadow-lg">
          <CardContent className="p-8 lg:p-12">
            {renderStep()}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-border/50">
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
                  <ArrowLeft className="w-4 h-4 mr-2" />
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

        {/* Bottom navigation */}
        <div className="text-center pt-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mx-auto"
          >
            <Home className="w-4 h-4" />
            חזרה ללוח הבקרה
          </Button>
        </div>
      </div>
    </div>
  );
};
