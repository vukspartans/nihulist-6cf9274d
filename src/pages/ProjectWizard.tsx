import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ArrowLeft, ArrowRight, Loader2, X, Home, Plus, Check, Building2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress"
import { supabase } from '@/integrations/supabase/client';
import { useAdvisorsValidation } from '@/hooks/useAdvisorsValidation';
import { PROJECT_PHASES } from '@/constants/project';
import { ProjectTypeSelector } from '@/components/ProjectTypeSelector';
import { useDropzone } from 'react-dropzone';
import { sanitizeFileName } from '@/utils/fileUtils';
import { useMunicipalities } from '@/hooks/useMunicipalities';
import { useTemplateResolver } from '@/hooks/useTemplateResolver';
import { useBulkTaskCreation } from '@/hooks/useBulkTaskCreation';

interface FormData {
  address: string;
  projectName: string;
  projectType: string;
  phase: string;
  budget: string;
  advisorsBudget: string;
  description: string;
  municipalityId: string;
}

interface FileWithMetadata {
  file: File;
  customName: string;
  description: string;
}

export const ProjectWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { primaryRole } = useAuth();
  const isMobile = useIsMobile();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    address: '',
    projectName: '',
    projectType: '',
    phase: '',
    budget: '',
    advisorsBudget: '',
    description: '',
    municipalityId: '',
  });
  const [filesWithMetadata, setFilesWithMetadata] = useState<FileWithMetadata[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<Array<{fileName: string, error: string}>>([]);
  const [user, setUser] = useState<any>(null);

  const totalSteps = 3;
  const { getCanonicalProjectTypes } = useAdvisorsValidation();
  const { data: municipalities = [] } = useMunicipalities(false); // Only active
  const { resolveTemplate } = useTemplateResolver();
  const { createStagesAndTasksFromTemplates } = useBulkTaskCreation();

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
        const { currentStep: savedStep, formData: savedFormData, filesMetadata } = JSON.parse(savedDraft);
        setCurrentStep(savedStep || 1);
        setFormData(prev => ({ ...prev, ...savedFormData }));
        
        if (filesMetadata && filesMetadata.length > 0) {
          toast({
            title: "קבצים שנשמרו בטיוטה",
            description: `נמצאו ${filesMetadata.length} קבצים בטיוטה. יש להעלותם מחדש.`,
          });
        }
      } catch (error) {
        console.error('Error restoring draft:', error);
      }
    }
  }, []);

  // Save draft to localStorage whenever formData or currentStep changes
  useEffect(() => {
    const draftData = { 
      currentStep, 
      formData,
      filesMetadata: filesWithMetadata.map(f => ({
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
        customName: f.customName,
        description: f.description
      }))
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
  }, [currentStep, formData, filesWithMetadata]);

  // Helper function for retry logic
  const uploadWithRetry = async (fileName: string, file: File, maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { error } = await supabase.storage
          .from('project-files')
          .upload(fileName, file, { upsert: true });
        
        if (!error) return { error: null };
        
        if (attempt < maxRetries) {
          console.warn(`[ProjectWizard] Upload attempt ${attempt + 1} failed, retrying...`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        } else {
          return { error };
        }
      } catch (err) {
        if (attempt >= maxRetries) {
          return { error: err };
        }
      }
    }
    return { error: new Error('Max retries exceeded') };
  };

  const createProjectInternal = async () => {
    if (!user) return null;

    console.log('[ProjectWizard] Pre-flight check:', {
      hasUser: !!user,
      filesCount: filesWithMetadata.length,
      formValid: !!formData.projectType && !!formData.phase
    });

    setCreating(true);
    try {
      // Validate and safely parse budget (remove commas for parsing)
      const budget = formData.budget ? Number(formData.budget.replace(/,/g, '')) : null;
      if (formData.budget && isNaN(budget!)) {
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
        status: 'active',
        timeline_start: today.toISOString().split('T')[0],
        timeline_end: oneYearFromNow.toISOString().split('T')[0],
        municipality_id: formData.municipalityId || null
      };

      const { data: project, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (error) throw error;

      console.log('[ProjectWizard] Post-project creation check:', {
        projectId: project.id,
        filesWillBeUploaded: filesWithMetadata.length
      });

      // Resolve and create tasks from templates (if available)
      try {
        const { templates, source } = await resolveTemplate(
          formData.projectType,
          formData.municipalityId || null
        );
        
        if (templates.length > 0) {
          console.log(`[ProjectWizard] Found ${templates.length} templates from ${source}`);
          const result = await createStagesAndTasksFromTemplates(
            project.id,
            templates,
            new Date()
          );
          console.log('[ProjectWizard] Created stages and tasks:', result);
        } else {
          console.log('[ProjectWizard] No templates found, task board will be empty');
        }
      } catch (templateError) {
        console.error('[ProjectWizard] Template creation error (non-blocking):', templateError);
        // Don't fail project creation if template loading fails
      }

      // Upload files if any and create project_files records
      const uploadedFileIds: string[] = [];
      if (filesWithMetadata.length > 0) {
        setUploading(true);
        setUploadProgress(0);
        setUploadErrors([]);
        console.log('[ProjectWizard] Starting file upload for', filesWithMetadata.length, 'files');
        
        for (let i = 0; i < filesWithMetadata.length; i++) {
          const fileWithMeta = filesWithMetadata[i];
          
          // Update progress
          setUploadProgress(Math.round(((i + 1) / filesWithMetadata.length) * 100));
          
          try {
            // Generate ASCII-safe filename for storage
            const sanitizedName = sanitizeFileName(fileWithMeta.file.name);
            const fileName = `${project.id}/${Date.now()}-${sanitizedName}`;
            
            console.log('[ProjectWizard] Uploading file:', {
              original: fileWithMeta.file.name,
              sanitized: sanitizedName,
              storagePath: fileName
            });

            // Upload with retry logic
            const { error: uploadError } = await uploadWithRetry(fileName, fileWithMeta.file);

            if (uploadError) {
              console.error('[ProjectWizard] Upload error:', {
                fileName: fileWithMeta.file.name,
                error: uploadError
              });
              setUploadErrors(prev => [...prev, {
                fileName: fileWithMeta.file.name,
                error: `Upload failed: ${uploadError.message}`
              }]);
              toast({
                title: "שגיאה בהעלאת קובץ",
                description: `לא ניתן להעלות את הקובץ ${fileWithMeta.file.name}`,
                variant: "destructive",
              });
              continue;
            }

            // Create project_files record
            const { data: insertedFile, error: dbError } = await supabase
              .from('project_files')
              .insert({
                project_id: project.id,
                file_name: sanitizedName, // ASCII-safe storage filename
                custom_name: fileWithMeta.customName || fileWithMeta.file.name, // Original Hebrew name for display
                description: fileWithMeta.description || null,
                file_type: fileWithMeta.file.type || 'application/octet-stream',
                file_url: fileName, // Store the storage key, not public URL
                size_mb: Math.round((fileWithMeta.file.size / 1_000_000) * 100) / 100,
              })
              .select('id')
              .single();

            if (dbError) {
              console.error('[ProjectWizard] Database insert error:', {
                fileName: fileWithMeta.file.name,
                error: dbError,
                errorMessage: dbError?.message,
                errorDetails: dbError?.details
              });
              setUploadErrors(prev => [...prev, {
                fileName: fileWithMeta.file.name,
                error: `Database error: ${dbError.message}`
              }]);
              toast({
                title: "שגיאה בשמירת קובץ",
                description: `לא ניתן לשמור פרטי קובץ ${fileWithMeta.file.name}`,
                variant: "destructive",
              });
            } else if (insertedFile) {
              console.log('[ProjectWizard] Successfully uploaded file:', {
                fileName: fileWithMeta.file.name,
                fileId: insertedFile.id
              });
              uploadedFileIds.push(insertedFile.id);
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
        setUploadProgress(0);
        console.log('[ProjectWizard] File upload complete. Errors:', uploadErrors.length);
      }

      // Trigger AI analysis for uploaded files in background
      if (uploadedFileIds.length > 0) {
        toast({
          title: "ניתוח AI מתבצע ברקע",
          description: `מנתח ${uploadedFileIds.length} קבצים. התוצאות יופיעו בעמוד הפרויקט.`,
        });

        // Analyze files in background (don't await)
        uploadedFileIds.forEach(fileId => {
          supabase.functions.invoke('analyze-project-file', {
            body: { fileId }
          }).catch(err => console.error('AI analysis failed:', err));
        });
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
      navigate(getDashboardRouteForRole(primaryRole));
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

  // Drag and drop configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      const newFilesWithMeta = acceptedFiles.map(file => ({
        file,
        customName: file.name,
        description: ''
      }));
      setFilesWithMetadata(prev => [...prev, ...newFilesWithMeta]);
    },
    noClick: false,
    noKeyboard: false,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    }
  });

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
      return !!formData.address && !!formData.projectType && !!formData.phase;
    }
    return true;
  };

  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-4 sm:space-y-8">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">פרטי הפרויקט</h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
              הזן את הפרטים הבסיסיים של הפרויקט שלך
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6">
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
              <Label className="text-base font-medium">
                סוג פרויקט <span className="text-destructive">*</span>
              </Label>
              <ProjectTypeSelector
                selectedType={formData.projectType}
                onTypeChange={(type) => handleSelectChange('projectType', type)}
                placeholder="בחר סוג פרויקט"
              />
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
                    <SelectItem key={phase} value={phase} className="text-right">
                      <span className="block w-full text-right">{phase}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Municipality - Optional */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                עירייה (אופציונלי)
              </Label>
              <Select 
                dir="rtl" 
                value={formData.municipalityId} 
                onValueChange={(value) => handleSelectChange('municipalityId', value)}
              >
                <SelectTrigger className="h-12 text-right justify-end">
                  <SelectValue placeholder="בחר עירייה" className="text-right" />
                </SelectTrigger>
                <SelectContent dir="rtl" align="end" className="bg-background border shadow-lg z-50 max-h-60">
                  {municipalities.map((municipality) => (
                    <SelectItem key={municipality.id} value={municipality.id} className="text-right">
                      <span className="block w-full text-right">{municipality.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                בחירת עירייה תטען תבניות משימות ספציפיות לרשות
              </p>
            </div>

            {/* Budget - Optional */}
            <div className="space-y-2">
              <Label htmlFor="budget" className="text-base font-medium">
                תקציב פרויקט (אופציונלי)
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
        <div className="space-y-4 sm:space-y-8">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">העלאת קבצים</h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
              העלה קבצים רלוונטיים לפרויקט שלך
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-4 sm:p-8 text-center transition-all duration-300 ${
                isDragActive 
                  ? 'border-primary bg-primary/20' 
                  : 'border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10'
              }`}
            >
              <input {...getInputProps()} />
              <div className="cursor-pointer flex flex-col items-center gap-3 sm:gap-6 group">
                <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-primary/70 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
                  <svg className="w-6 h-6 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <p className="text-base sm:text-xl font-semibold text-foreground">
                    {isDragActive ? 'שחרר כאן...' : 'לחץ כדי להעלות קבצים'}
                  </p>
                  <p className="text-muted-foreground text-sm hidden sm:block">או גרור ושחרר קבצים כאן</p>
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-4">
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-background rounded-full border">PDF</span>
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-background rounded-full border">תמונות</span>
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-background rounded-full border">מסמכים</span>
                  </div>
                </div>
              </div>
            </div>

            {filesWithMetadata.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-2 sm:mb-4">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <h3 className="font-semibold text-base sm:text-lg">קבצים שנבחרו ({filesWithMetadata.length})</h3>
                </div>
                <div className="grid gap-3 sm:gap-4">
                  {filesWithMetadata.map((fileWithMeta, index) => (
                    <div key={index} className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground text-sm sm:text-base truncate">{fileWithMeta.customName || fileWithMeta.file.name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {(fileWithMeta.file.size / 1_000_000).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        <div>
                          <Label htmlFor={`customName-${index}`} className="text-xs sm:text-sm font-medium">שם קובץ מותאם</Label>
                          <Input
                            id={`customName-${index}`}
                            value={fileWithMeta.customName}
                            onChange={(e) => updateFileMetadata(index, 'customName', e.target.value)}
                            placeholder="הכנס שם קובץ"
                            className="mt-1.5 sm:mt-2 h-9 sm:h-10 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`description-${index}`} className="text-xs sm:text-sm font-medium">תיאור</Label>
                          <Textarea
                            id={`description-${index}`}
                            value={fileWithMeta.description}
                            onChange={(e) => updateFileMetadata(index, 'description', e.target.value)}
                            placeholder="תיאור קצר של הקובץ"
                            className="mt-1.5 sm:mt-2 min-h-16 sm:min-h-20 text-sm"
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
        <div className="space-y-4 sm:space-y-8">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3">סקירה ואישור</h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
              בדוק את פרטי הפרויקט לפני יצירתו
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Project Summary */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-xl">סיכום הפרויקט</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">כתובת</p>
                    <p className="text-sm sm:text-base font-medium">{formData.address}</p>
                  </div>
                  
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">שם הפרויקט</p>
                    <p className="text-sm sm:text-base font-medium">{formData.projectName.trim() || formData.address.trim()}</p>
                  </div>
                  
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">סוג פרויקט</p>
                    <p className="text-sm sm:text-base font-medium">{formData.projectType}</p>
                  </div>
                  
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">סטטוס הפרויקט</p>
                    <p className="text-sm sm:text-base font-medium">{formData.phase}</p>
                  </div>
                  
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">תקציב פרויקט</p>
                    <p className="text-sm sm:text-base font-medium">
                      {formData.budget ? `₪${parseInt(formData.budget.replace(/,/g, '')).toLocaleString()}` : 'לא הוגדר'}
                    </p>
                  </div>
                  
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">תקציב יועצים</p>
                    <p className="text-sm sm:text-base font-medium">
                      {formData.advisorsBudget ? `₪${parseInt(formData.advisorsBudget.replace(/,/g, '')).toLocaleString()}` : 'לא הוגדר'}
                    </p>
                  </div>
                </div>
                
                {formData.description && (
                  <div className="space-y-1 sm:space-y-2 pt-3 sm:pt-4 border-t">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">תיאור נוסף</p>
                    <p className="text-sm sm:text-base leading-relaxed">{formData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Errors */}
            {uploadErrors.length > 0 && (
              <Card className="shadow-sm border-destructive">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-destructive">שגיאות בהעלאת קבצים</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {uploadErrors.map((err, idx) => (
                      <li key={idx} className="text-sm">
                        <strong>{err.fileName}</strong>: {err.error}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Files Summary */}
            {filesWithMetadata.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">קבצים ({filesWithMetadata.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {uploading && uploadProgress > 0 && (
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">מעלה קבצים...</span>
                        <span className="font-medium">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
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
              <CardHeader className="pb-2 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-xl flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  הצעדים הבאים
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p>המערכת תיצור את הפרויקט ותשמור את כל הפרטים</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p>תוכל לעבור לאיתור יועצים או לחזור ללוח הבקרה</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p>הפרויקט יישמר במצב טיוטה עד להפעלתו</p>
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
      <div className="container mx-auto px-3 sm:px-4 pt-3 sm:pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground hover:text-foreground text-sm"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">חזרה ללוח הבקרה</span>
          <span className="sm:hidden">חזרה</span>
        </Button>
      </div>
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 md:py-12">
        <div className="mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-6">
            יצירת פרויקט חדש
          </h1>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2 sm:h-3 max-w-md mx-auto" />
          <div className="mt-2 sm:mt-4 text-center text-muted-foreground text-sm sm:text-base">
            שלב {currentStep} מתוך {totalSteps}
          </div>
        </div>

        <Card className="max-w-5xl mx-auto shadow-lg">
          <CardContent className="p-4 sm:p-6 lg:p-12">
            {renderStep()}

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-0 mt-6 sm:mt-12 pt-4 sm:pt-8 border-t border-border/50">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  size={isMobile ? "default" : "default"}
                  className="flex items-center justify-center gap-2 order-2 sm:order-1"
                >
                  <ArrowLeft className="w-4 h-4 ml-1 sm:ml-2 flip-rtl-180" />
                  הקודם
                </Button>
              ) : (
                <div className="hidden sm:block" />
              )}

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid(currentStep)}
                  className="flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  הבא
                  <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                </Button>
              ) : (
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={createAndFinish}
                    disabled={creating || uploading}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    {creating || uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="sm:hidden">{uploading ? 'מעלה...' : 'יוצר...'}</span>
                        <span className="hidden sm:inline">{uploading ? 'מעלה קבצים...' : 'יוצר פרויקט...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 sm:hidden" />
                        <span>סיום</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={createAndGoToAdvisors}
                    disabled={creating || uploading}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    {creating || uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="sm:hidden">{uploading ? 'מעלה...' : 'יוצר...'}</span>
                        <span className="hidden sm:inline">{uploading ? 'מעלה קבצים...' : 'יוצר פרויקט...'}</span>
                      </>
                    ) : (
                      <>
                        <span className="sm:hidden">לאיתור יועצים</span>
                        <span className="hidden sm:inline">צור ועבור לאיתור יועצים</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bottom navigation - hidden on mobile since we have top nav */}
        <div className="text-center pt-4 sm:pt-8 hidden sm:block">
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
