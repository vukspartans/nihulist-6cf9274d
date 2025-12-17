import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Save, FileText, Paperclip, Upload, X, CheckCircle, AlertCircle, Eye, Sparkles, Loader2, Home, List, Coins, CreditCard, Wand2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
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
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [canAutoClose, setCanAutoClose] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [rfpDocumentFile, setRfpDocumentFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('main');
  const [isContentAIGenerated, setIsContentAIGenerated] = useState(false);
  
  const defaultData = getDefaultData(projectName, advisorType);
  const [formData, setFormData] = useState<AdvisorTypeRequestData>({
    ...defaultData,
    ...initialData
  });

  useEffect(() => {
    setFormData({
      ...defaultData,
      ...initialData
    });
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

  const handleSave = () => {
    onSave({
      ...formData,
      hasBeenReviewed: true,
      lastEditedAt: new Date()
    });
    setIsOpen(false);
    toast({
      title: "נשמר בהצלחה",
      description: `הבקשה עבור "${advisorType}" עודכנה`,
    });
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
      <DialogContent className="max-w-5xl max-h-[95vh]" dir="rtl">
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-4 mb-4 flex-row-reverse">
            <TabsTrigger value="main" className="flex items-center gap-2 flex-row-reverse">
              <Home className="h-4 w-4" />
              ראשי
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2 flex-row-reverse">
              <List className="h-4 w-4" />
              פירוט שירותים
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2 flex-row-reverse">
              <Coins className="h-4 w-4" />
              שכר טרחה
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2 flex-row-reverse">
              <CreditCard className="h-4 w-4" />
              תשלום
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-280px)] overflow-y-auto" dir="rtl">
            <div className="pr-4 pb-4">
              {/* Main Tab */}
              <TabsContent value="main" className="mt-0 space-y-4" dir="rtl">
                {/* AI Content Extraction Section - Compact */}
                <div className="flex gap-2 items-center p-3 border rounded-lg bg-muted/30">
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
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
                    className="flex-1 justify-start"
                    disabled={extracting}
                  >
                    <Upload className="h-4 w-4 ml-2" />
                    {rfpDocumentFile ? rfpDocumentFile.name : 'חילוץ אוטומטי מקובץ'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleExtractContent}
                    disabled={!rfpDocumentFile || extracting}
                  >
                    {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'חלץ'}
                  </Button>
                  {rfpDocumentFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRfpDocumentFile(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Request Title */}
                <div className="space-y-1">
                  <Label htmlFor="request-title" className="text-right block">כותרת הבקשה</Label>
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
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <Label htmlFor="request-content" className="text-right">תיאור הבקשה</Label>
                    {isContentAIGenerated && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-primary cursor-help flex-row-reverse">
                              <Wand2 className="h-4 w-4" />
                              <span className="text-xs">תוכן AI</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" dir="rtl" className="max-w-xs">
                            <p>התוכן נוצר באמצעות בינה מלאכותית ועשוי להכיל טעויות. מומלץ לבדוק ולערוך את התוכן לפני השליחה.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Textarea
                    id="request-content"
                    value={formData.requestContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestContent: e.target.value }))}
                    rows={6}
                    className="text-right font-sans leading-relaxed"
                    dir="rtl"
                    placeholder="תאר את הפרויקט והדרישות שלך"
                  />
                </div>

                {/* File Attachments */}
                <div className="space-y-1">
                  <Label htmlFor="request-files" className="text-right block">קבצים מצורפים</Label>
                  <div>
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
                      onClick={() => document.getElementById('request-files')?.click()}
                      className="w-full"
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 ml-2" />
                      {uploading ? 'מעלה...' : 'העלה קבצים'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      תוכל לצרף תוכניות, מפרטים, או מסמכים רלוונטיים (עד 10MB לקובץ)
                    </p>
                  </div>
                  
                  {formData.requestAttachments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <p className="text-sm font-medium text-muted-foreground text-right">
                        {formData.requestAttachments.length} קבצים מצורפים
                      </p>
                      {formData.requestAttachments.map((file, index) => {
                        const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);
                        const isPDF = /\.pdf$/i.test(file.name);
                        
                        return (
                          <div 
                            key={index}
                            className="group relative flex items-center gap-3 p-3 bg-muted hover:bg-muted/80 rounded-lg border border-border hover:border-primary/50 transition-all"
                            dir="rtl"
                          >
                            {isImage ? (
                              <div className="w-10 h-10 rounded overflow-hidden bg-background flex-shrink-0">
                                <img 
                                  src={file.url} 
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded bg-background flex items-center justify-center flex-shrink-0">
                                {isPDF ? (
                                  <FileText className="h-5 w-5 text-red-500" />
                                ) : (
                                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => handleFilePreview(file)}
                              className="flex-1 text-right hover:text-primary transition-colors"
                            >
                              <span className="text-sm font-medium line-clamp-1">{file.name}</span>
                              <Badge variant="outline" className="text-xs ml-2">
                                {formatFileSize(file.size)}
                              </Badge>
                            </button>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFilePreview(file)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
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

        <Alert className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-right">
            המידע שתזין כאן יהיה זמין ליועץ במערכת Billding לאחר הכניסה שלו
          </AlertDescription>
        </Alert>

        <DialogFooter className="flex gap-2 mt-4">
          <Button variant="outline" onClick={handleCancel}>
            ביטול
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
