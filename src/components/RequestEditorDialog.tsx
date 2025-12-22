import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Save, FileText, Paperclip, Upload, X, CheckCircle, Eye, Sparkles, Loader2, Home, List, Coins, CreditCard, Wand2, Edit2, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useRFPDraft } from '@/hooks/useRFPDraft';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeFileName, isValidFileType, isValidFileSize, formatFileSize } from '@/utils/fileUtils';
import { reportableError, formatSupabaseError } from '@/utils/errorReporting';
import { 
  AdvisorTypeRequestData, 
  ServiceDetailsMode, 
  ServiceScopeItem, 
  RFPFeeItem, 
  PaymentTerms,
  UploadedFileMetadata 
} from '@/types/rfpRequest';
import { ServiceDetailsTab } from '@/components/rfp/ServiceDetailsTab';
import { FeeItemsTable } from '@/components/rfp/FeeItemsTable';
import { PaymentTermsTab } from '@/components/rfp/PaymentTermsTab';

// Re-export for backward compatibility
export type { UploadedFileMetadata, AdvisorTypeRequestData } from '@/types/rfpRequest';

interface RequestEditorDialogProps {
  advisorType: string;
  projectName: string;
  projectId: string;
  rfpId?: string;
  recipientCount: number;
  initialData?: Partial<AdvisorTypeRequestData>;
  onSave: (data: AdvisorTypeRequestData) => void;
  hasBeenReviewed?: boolean;
}

const getDefaultData = (projectName: string, advisorType: string): AdvisorTypeRequestData => ({
  requestTitle: `${projectName} – בקשה לקבלת הצעת מחיר עבור שירותי תכנון ${advisorType}`,
  requestContent: `שלום,

אנו מעוניינים לקבל הצעת מחיר עבור הפרויקט "${projectName}".

אנא עיינו בפרטים המצורפים והגישו הצעת מחיר במערכת Billding.

נשמח לשמוע מכם בהקדם.`,
  requestAttachments: [],
  hasBeenReviewed: false,
  
  // Service details
  serviceDetailsMode: 'free_text',
  serviceDetailsFreeText: '',
  serviceDetailsFile: undefined,
  serviceScopeItems: [],
  
  // Fee items
  feeItems: [],
  optionalFeeItems: [],
  
  // Payment terms
  paymentTerms: {
    advance_percent: 20,
    milestone_payments: [],
    payment_due_days: 30,
    notes: ''
  }
});

export const RequestEditorDialog = ({
  advisorType,
  projectName,
  projectId,
  rfpId,
  recipientCount,
  initialData,
  onSave,
  hasBeenReviewed = false
}: RequestEditorDialogProps) => {
  const { toast } = useToast();
  const { saveDraft, loadDraft, saving } = useRFPDraft(projectId);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [canAutoClose, setCanAutoClose] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [rfpDocumentFile, setRfpDocumentFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('main');
  const [isContentAIGenerated, setIsContentAIGenerated] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Auto-enable preview when AI content is generated
  useEffect(() => {
    if (isContentAIGenerated) {
      setIsPreviewMode(true);
    }
  }, [isContentAIGenerated]);

  // Parse markdown-like content for formatted preview
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Bold headers (e.g., **Subject line**)
      if (line.match(/^\*\*(.+)\*\*$/)) {
        const text = line.replace(/^\*\*(.+)\*\*$/, '$1');
        return <h4 key={index} className="font-bold text-base mt-3 mb-1">{text}</h4>;
      }
      
      // Inline bold
      const processedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      
      // Bullet points
      if (line.match(/^[-•]\s/)) {
        const text = line.replace(/^[-•]\s/, '');
        return (
          <div key={index} className="flex gap-2 mr-2 my-0.5" dir="rtl">
            <span className="text-primary">•</span>
            <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        );
      }
      
      // Numbered list
      if (line.match(/^\d+\.\s/)) {
        const num = line.match(/^(\d+)\./)?.[1];
        const text = line.replace(/^\d+\.\s/, '');
        return (
          <div key={index} className="flex gap-2 mr-2 my-0.5" dir="rtl">
            <span className="text-primary font-medium">{num}.</span>
            <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        );
      }
      
      // Empty line
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }
      
      // Regular text
      return (
        <p key={index} className="my-0.5" dangerouslySetInnerHTML={{ __html: processedLine }} />
      );
    });
  };
  
  const defaultData = getDefaultData(projectName, advisorType);
  const [formData, setFormData] = useState<AdvisorTypeRequestData>({
    ...defaultData,
    ...initialData
  });

  // Initialize form data and load draft when dialog opens
  useEffect(() => {
    const loadExistingDraft = async () => {
      if (isOpen && !draftLoaded) {
        const draft = await loadDraft(advisorType);
        if (draft) {
          setFormData(prev => ({
            ...defaultData,
            ...draft,
            // Preserve initialData overrides if they exist
            ...initialData
          }));
          setDraftLoaded(true);
        } else {
          setFormData({
            ...defaultData,
            ...initialData
          });
          setDraftLoaded(true);
        }
      }
    };

    if (isOpen) {
      loadExistingDraft();
    } else {
      setDraftLoaded(false);
    }
  }, [isOpen, advisorType, loadDraft, draftLoaded]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        ...defaultData,
        ...initialData
      });
    }
  }, [initialData, projectName, advisorType]);

  // Refresh signed URLs for existing attachments
  useEffect(() => {
    const refreshSignedUrls = async () => {
      if (!formData.requestAttachments || formData.requestAttachments.length === 0) {
        return;
      }

      const refreshedAttachments = await Promise.all(
        formData.requestAttachments.map(async (attachment) => {
          if (attachment.path && attachment.url) {
            const { data, error } = await supabase.storage
              .from('rfp-request-files')
              .createSignedUrl(attachment.path, 3600 * 24 * 7);

            if (!error && data) {
              return {
                ...attachment,
                url: data.signedUrl
              };
            }
          }
          return attachment;
        })
      );

      setFormData(prev => ({
        ...prev,
        requestAttachments: refreshedAttachments
      }));
    };

    refreshSignedUrls();
  }, []);

  // Prevent dialog from closing when returning from preview tab
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen) {
        setCanAutoClose(false);
        setTimeout(() => setCanAutoClose(true), 300);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOpen]);

  const handleRfpDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isValidFileType(file.name)) {
        toast({
          title: "סוג קובץ לא נתמך",
          description: "אנא העלה קובץ PDF, Word או תמונה",
          variant: "destructive",
        });
        return;
      }
      if (!isValidFileSize(file.size, 20)) {
        toast({
          title: "קובץ גדול מדי",
          description: "גודל הקובץ המקסימלי הוא 20MB",
          variant: "destructive",
        });
        return;
      }
      setRfpDocumentFile(file);
    }
    e.target.value = '';
  };

  const handleExtractContent = async () => {
    if (!rfpDocumentFile) {
      toast({
        title: "לא נבחר קובץ",
        description: "אנא בחר קובץ בקשת הצעת מחיר לחילוץ",
        variant: "destructive",
      });
      return;
    }

    setExtracting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("לא מחובר למערכת");
      }

      const sanitizedName = sanitizeFileName(rfpDocumentFile.name);
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileExt = sanitizedName.split('.').pop();
      const tempPath = `${projectId}/temp/${timestamp}_${randomId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('rfp-request-files')
        .upload(tempPath, rfpDocumentFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`שגיאה בהעלאת הקובץ: ${uploadError.message}`);
      }

      const { data, error } = await supabase.functions.invoke('extract-rfp-content', {
        body: { filePath: tempPath }
      });

      await supabase.storage.from('rfp-request-files').remove([tempPath]);

      if (error) {
        throw new Error(error.message || "שגיאה בחילוץ התוכן");
      }

      if (data?.success && data?.content) {
        setFormData(prev => ({
          ...prev,
          requestContent: data.content
        }));
        setIsContentAIGenerated(true);
        setRfpDocumentFile(null);
        toast({
          title: "תוכן חולץ בהצלחה",
          description: "תיאור הבקשה עודכן מתוך הקובץ. ניתן לערוך את התוכן.",
        });
      } else {
        throw new Error(data?.error || "לא הצלחנו לחלץ תוכן מהקובץ");
      }
    } catch (error) {
      console.error('[RequestEditor] Extract error:', error);
      toast({
        title: "שגיאה בחילוץ התוכן",
        description: error instanceof Error ? error.message : "אירעה שגיאה בחילוץ התוכן מהקובץ",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedFiles: UploadedFileMetadata[] = [];
    const errors: string[] = [];

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: "שגיאת אימות",
          description: "יש להתחבר מחדש למערכת",
          variant: "destructive",
        });
        setUploading(false);
        e.target.value = '';
        return;
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', projectId)
        .eq('owner_id', session.user.id)
        .single();

      if (projectError || !project) {
        toast({
          title: "שגיאה",
          description: "לא ניתן לאמת הרשאות לפרויקט זה",
          variant: "destructive",
        });
        setUploading(false);
        e.target.value = '';
        return;
      }

      for (const file of files) {
        if (!isValidFileType(file.name)) {
          errors.push(`${file.name}: סוג קובץ לא נתמך`);
          continue;
        }

        if (!isValidFileSize(file.size, 10)) {
          errors.push(`${file.name}: גדול מ-10MB (${formatFileSize(file.size)})`);
          continue;
        }

        const sanitizedName = sanitizeFileName(file.name);
        const fileExt = sanitizedName.split('.').pop();
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const uniqueFileName = `${timestamp}_${randomId}.${fileExt}`;
        const filePath = `${projectId}/${timestamp}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('rfp-request-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

        if (uploadError) {
          const errorMessage = uploadError.message?.includes('row-level security')
            ? 'בעיית הרשאות. נסה לרענן את הדף ולהתחבר מחדש.'
            : formatSupabaseError(uploadError);
          errors.push(`${file.name}: ${errorMessage}`);
          continue;
        }

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('rfp-request-files')
          .createSignedUrl(filePath, 3600 * 24 * 7);

        if (signedUrlError || !signedUrlData) {
          errors.push(`${file.name}: שגיאה ביצירת קישור לקובץ`);
          continue;
        }

        uploadedFiles.push({
          name: file.name,
          url: signedUrlData.signedUrl,
          size: file.size,
          path: filePath
        });
      }

      if (uploadedFiles.length > 0) {
        setFormData(prev => ({
          ...prev,
          requestAttachments: [...prev.requestAttachments, ...uploadedFiles]
        }));

        toast({
          title: "קבצים הועלו בהצלחה",
          description: `${uploadedFiles.length} קבצים הועלו`,
        });
      }

      if (errors.length > 0) {
        toast({
          title: "שגיאות בהעלאת קבצים",
          description: errors.join('\n'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהעלאת הקבצים",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleFilePreview = async (file: UploadedFileMetadata) => {
    const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);
    
    try {
      setCanAutoClose(false);
      
      let previewUrl = file.url;
      
      if (file.path) {
        const { data, error } = await supabase.storage
          .from('rfp-request-files')
          .createSignedUrl(file.path, 3600);
        
        if (!error && data) {
          previewUrl = data.signedUrl;
        }
      }
      
      if (isImage) {
        window.open(previewUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = previewUrl;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      setTimeout(() => {
        setCanAutoClose(true);
      }, 500);
    } catch (error) {
      setCanAutoClose(true);
      toast({
        title: "שגיאה בתצוגה מקדימה",
        description: "לא ניתן להציג את הקובץ כרגע",
        variant: "destructive",
      });
    }
  };

  const removeAttachment = async (index: number) => {
    const file = formData.requestAttachments[index];
    
    try {
      if (file.path) {
        const { error } = await supabase.storage
          .from('rfp-request-files')
          .remove([file.path]);
        
        if (error) {
          toast({
            title: "שגיאה במחיקת קובץ",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
      }

      setFormData(prev => ({
        ...prev,
        requestAttachments: prev.requestAttachments.filter((_, i) => i !== index)
      }));

      toast({
        title: "קובץ נמחק",
        description: `${file.name} הוסר מהרשימה`,
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את הקובץ",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    const dataToSave = {
      ...formData,
      hasBeenReviewed: true,
      lastEditedAt: new Date()
    };

    // Save to database first
    const saved = await saveDraft(advisorType, dataToSave);
    
    if (saved) {
      // Then update parent state
      onSave(dataToSave);
      setIsOpen(false);
      toast({
        title: "נשמר בהצלחה",
        description: `הבקשה עבור "${advisorType}" נשמרה במאגר הנתונים`,
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      ...defaultData,
      ...initialData
    });
    setRfpDocumentFile(null);
    setActiveTab('main');
    setIsOpen(false);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open && canAutoClose) {
          setIsOpen(false);
        } else if (open) {
          setIsOpen(true);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button 
          variant={hasBeenReviewed ? "outline" : "default"}
          size="sm" 
          className="flex items-center gap-2"
        >
          {hasBeenReviewed ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              ערוך בקשה
            </>
          ) : (
            <>
              <Edit className="w-4 h-4" />
              ערוך בקשה
              <Badge variant="destructive" className="mr-2 animate-pulse">דורש עריכה</Badge>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] sm:max-h-[95vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            עריכת בקשה - {advisorType}
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
            <Badge variant="secondary">{recipientCount} נמענים</Badge>
            {hasBeenReviewed && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                נערך
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 min-h-0 flex flex-col" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 mb-4 flex-row-reverse h-auto">
            <TabsTrigger value="main" className="flex items-center gap-1 sm:gap-2 flex-row-reverse text-xs sm:text-sm py-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">ראשי</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-1 sm:gap-2 flex-row-reverse text-xs sm:text-sm py-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">פירוט שירותים</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-1 sm:gap-2 flex-row-reverse text-xs sm:text-sm py-2">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">שכר טרחה</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-1 sm:gap-2 flex-row-reverse text-xs sm:text-sm py-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">תשלום</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 overflow-y-auto" dir="rtl">
            <div className="pr-4 pb-4">
              {/* Main Tab */}
              <TabsContent value="main" className="mt-0 space-y-3" dir="rtl">
                {/* Request Title */}
                <div className="space-y-1">
                  <Label htmlFor="request-title" className="block text-right">כותרת הבקשה</Label>
                  <Input
                    id="request-title"
                    value={formData.requestTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestTitle: e.target.value }))}
                    className="text-right"
                    dir="rtl"
                    placeholder="כותרת הבקשה שתוצג ליועץ"
                  />
                </div>

                {/* Request Content */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between" dir="rtl">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="request-content">תיאור הבקשה</Label>
                      {isContentAIGenerated && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-primary cursor-help">
                                <Wand2 className="h-3.5 w-3.5" />
                                <span className="text-xs">AI</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" dir="rtl" className="max-w-xs">
                              <p>התוכן נוצר באמצעות בינה מלאכותית. מומלץ לבדוק לפני השליחה.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {formData.requestContent && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className="h-7 px-2 text-xs gap-1"
                      >
                        {isPreviewMode ? (
                          <>
                            <Edit2 className="h-3.5 w-3.5" />
                            ערוך
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            תצוגה
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {isPreviewMode && formData.requestContent ? (
                    <div 
                      className="border rounded-lg p-3 bg-muted/30 text-right text-sm leading-relaxed min-h-[100px] max-h-[200px] overflow-y-auto"
                      dir="rtl"
                    >
                      {renderFormattedContent(formData.requestContent)}
                    </div>
                  ) : (
                    <Textarea
                      id="request-content"
                      value={formData.requestContent}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, requestContent: e.target.value }));
                        if (isContentAIGenerated) setIsContentAIGenerated(false);
                      }}
                      rows={4}
                      className="text-right font-sans leading-relaxed min-h-[100px] resize-y"
                      dir="rtl"
                      placeholder="תאר את הפרויקט והדרישות שלך"
                    />
                  )}
                </div>

                {/* Combined: AI Extraction + File Attachments */}
                <div className="space-y-2">
                  <Label className="block text-right">קבצים וחילוץ אוטומטי</Label>
                  
                  {/* Action buttons row */}
                  <div className="flex flex-wrap gap-2" dir="rtl">
                    {/* AI Extraction */}
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="file"
                        id="rfp-document"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={handleRfpDocumentSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('rfp-document')?.click()}
                        disabled={extracting}
                        className="gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {rfpDocumentFile ? (
                          <span className="max-w-[120px] truncate">{rfpDocumentFile.name}</span>
                        ) : (
                          'חילוץ מקובץ'
                        )}
                      </Button>
                      {rfpDocumentFile && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleExtractContent}
                            disabled={extracting}
                            className="h-8"
                          >
                            {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'חלץ'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRfpDocumentFile(null)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* File Upload */}
                    <input
                      type="file"
                      id="request-files"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('request-files')?.click()}
                      disabled={uploading}
                      className="gap-1.5"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {uploading ? 'מעלה...' : 'צרף קבצים'}
                      {formData.requestAttachments.length > 0 && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                          {formData.requestAttachments.length}
                        </Badge>
                      )}
                    </Button>
                  </div>
                  
                  {/* Attached files list - compact */}
                  {formData.requestAttachments.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {formData.requestAttachments.map((file, index) => {
                        const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);
                        const isPDF = /\.pdf$/i.test(file.name);
                        
                        return (
                          <div 
                            key={index}
                            className="group flex items-center gap-2 p-2 bg-muted/50 hover:bg-muted rounded-md border border-border/50 hover:border-primary/30 transition-all"
                            dir="rtl"
                          >
                            {isImage ? (
                              <div className="w-8 h-8 rounded overflow-hidden bg-background flex-shrink-0">
                                <img 
                                  src={file.url} 
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded bg-background flex items-center justify-center flex-shrink-0">
                                {isPDF ? (
                                  <FileText className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => handleFilePreview(file)}
                              className="flex-1 text-right hover:text-primary transition-colors min-w-0"
                            >
                              <span className="text-sm font-medium truncate block">{file.name}</span>
                            </button>
                            
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {formatFileSize(file.size)}
                            </Badge>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFilePreview(file)}
                                className="h-7 w-7 p-0"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="mt-0" dir="rtl">
                <ServiceDetailsTab
                  mode={formData.serviceDetailsMode}
                  onModeChange={(mode) => setFormData(prev => ({ ...prev, serviceDetailsMode: mode }))}
                  freeText={formData.serviceDetailsFreeText}
                  onFreeTextChange={(text) => setFormData(prev => ({ ...prev, serviceDetailsFreeText: text }))}
                  file={formData.serviceDetailsFile}
                  onFileChange={(file) => setFormData(prev => ({ ...prev, serviceDetailsFile: file }))}
                  scopeItems={formData.serviceScopeItems || []}
                  onScopeItemsChange={(items) => setFormData(prev => ({ ...prev, serviceScopeItems: items }))}
                  feeItems={formData.feeItems || []}
                  advisorType={advisorType}
                  projectId={projectId}
                />
              </TabsContent>

              {/* Fees Tab */}
              <TabsContent value="fees" className="mt-0" dir="rtl">
                <FeeItemsTable
                  items={formData.feeItems || []}
                  optionalItems={formData.optionalFeeItems || []}
                  onItemsChange={(items) => setFormData(prev => ({ ...prev, feeItems: items }))}
                  onOptionalItemsChange={(items) => setFormData(prev => ({ ...prev, optionalFeeItems: items }))}
                />
              </TabsContent>

              {/* Payment Tab */}
              <TabsContent value="payment" className="mt-0" dir="rtl">
                <PaymentTermsTab
                  paymentTerms={formData.paymentTerms || { advance_percent: 20, payment_due_days: 30 }}
                  onPaymentTermsChange={(terms) => setFormData(prev => ({ ...prev, paymentTerms: terms }))}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <Alert className="mt-2 flex-shrink-0">
          <Database className="h-4 w-4" />
          <AlertDescription className="text-right">
            השינויים נשמרים במאגר הנתונים ויישמרו גם לאחר רענון הדף
          </AlertDescription>
        </Alert>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4 flex-shrink-0">
          <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto" disabled={saving}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 w-full sm:w-auto">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
