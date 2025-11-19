import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Save, FileText, Mail, Paperclip, Upload, X, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeFileName, isValidFileType, isValidFileSize, formatFileSize } from '@/utils/fileUtils';
import { reportableError, formatSupabaseError } from '@/utils/errorReporting';

export interface UploadedFileMetadata {
  name: string;
  url: string;
  size: number;
  path: string;
}

export interface AdvisorTypeRequestData {
  requestTitle: string;
  requestContent: string;
  requestAttachments: UploadedFileMetadata[];
  emailSubject: string;
  emailBody: string;
  hasBeenReviewed: boolean;
  lastEditedAt?: Date;
}

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

const getDefaultData = (projectName: string): AdvisorTypeRequestData => ({
  requestTitle: `בקשה להצעת מחיר - ${projectName}`,
  requestContent: `שלום,

אנו מעוניינים לקבל הצעת מחיר עבור הפרויקט "${projectName}".

אנא עיינו בפרטים המצורפים והגישו הצעת מחיר במערכת ניהוליסט.

נשמח לשמוע מכם בהקדם.`,
  requestAttachments: [],
  emailSubject: `בקשה להצעת מחיר - ${projectName}`,
  emailBody: `שלום {{שם_המשרד}},

קיבלת אפשרות להגיש הצעת מחיר לפרויקט חדש דרך מערכת ניהוליסט – הפלטפורמה המחברת בין יזמים ליועצים ומנהלת את כל תהליך העבודה במקום אחד.

במערכת תוכלו:
✅ להגיש הצעות מחיר בצורה מסודרת.
✅ לעקוב אחרי סטטוס הפניות וההצעות שלך.
✅ לקבל התראות בזמן אמת על פניות חדשות מפרויקטים רלוונטיים.

כדי לצפות בפרטי הפרויקט ולהגיש הצעת מחיר –
היכנס/י עכשיו למערכת ניהוליסט ›

)אם זו הפעם הראשונה שלך – ההרשמה קצרה ולוקחת פחות מדקה(.

בהצלחה,
צוות ניהוליסט`,
  hasBeenReviewed: false
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
  const [activeTab, setActiveTab] = useState<string>("request");
  const [uploading, setUploading] = useState(false);
  const [canAutoClose, setCanAutoClose] = useState(true);
  
  const defaultData = getDefaultData(projectName);
  const [formData, setFormData] = useState<AdvisorTypeRequestData>({
    ...defaultData,
    ...initialData
  });

  useEffect(() => {
    setFormData({
      ...defaultData,
      ...initialData
    });
  }, [initialData, projectName]);

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
              .createSignedUrl(attachment.path, 3600 * 24 * 7); // 7 days

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedFiles: UploadedFileMetadata[] = [];
    const errors: string[] = [];

    try {
      // VERIFY SESSION BEFORE UPLOAD
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        const errorMsg = reportableError(
          'שגיאת אימות',
          'יש להתחבר מחדש למערכת',
          { sessionError: sessionError?.message }
        );
        toast({
          title: "שגיאת אימות",
          description: errorMsg,
          variant: "destructive",
        });
        setUploading(false);
        e.target.value = '';
        return;
      }

      // Verify user owns this project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', projectId)
        .eq('owner_id', session.user.id)
        .single();

      if (projectError || !project) {
        const errorMsg = reportableError(
          'שגיאה',
          'לא ניתן לאמת הרשאות לפרויקט זה',
          { projectError: projectError?.message, projectId }
        );
        toast({
          title: "שגיאה",
          description: errorMsg,
          variant: "destructive",
        });
        setUploading(false);
        e.target.value = '';
        return;
      }

      console.log('[RequestEditor] Session verified, user owns project:', {
        userId: session.user.id,
        projectId: project.id
      });

      for (const file of files) {
        // Validate file type
        if (!isValidFileType(file.name)) {
          errors.push(`${file.name}: סוג קובץ לא נתמך`);
          continue;
        }

        // Validate file size (10MB limit)
        if (!isValidFileSize(file.size, 10)) {
          errors.push(`${file.name}: גדול מ-10MB (${formatFileSize(file.size)})`);
          continue;
        }

        // Sanitize file name and generate unique path
        const sanitizedName = sanitizeFileName(file.name);
        const fileExt = sanitizedName.split('.').pop();
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const uniqueFileName = `${timestamp}_${randomId}.${fileExt}`;
        
        // Project-based path structure (no temp folder, no advisor type)
        const filePath = `${projectId}/${timestamp}/${uniqueFileName}`;

        console.log('[RequestEditor] Uploading file:', {
          original: file.name,
          sanitized: sanitizedName,
          path: filePath,
          size: formatFileSize(file.size)
        });

        // Upload to storage with explicit auth header
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
          // Enhanced error logging
          console.error('[RequestEditor] Upload error details:', {
            error: uploadError,
            message: uploadError.message,
            path: filePath,
            projectId,
            userId: session.user.id,
            bucketId: 'rfp-request-files',
            folderStructure: filePath.split('/'),
            authToken: session.access_token ? 'Present' : 'Missing',
            tokenExpiry: session.expires_at,
            fileSize: file.size,
            fileType: file.type
          });
          
          // User-friendly error with actionable steps
          const errorMessage = uploadError.message?.includes('row-level security')
            ? 'בעיית הרשאות. נסה:\n1. לרענן את הדף\n2. להתחבר מחדש\n3. לנסות שוב'
            : formatSupabaseError(uploadError);
            
          errors.push(`${file.name}: ${errorMessage}`);
          continue;
        }

        // Get signed URL (private bucket)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('rfp-request-files')
          .createSignedUrl(filePath, 3600 * 24 * 7); // 7 days expiry

        if (signedUrlError || !signedUrlData) {
          console.error('[RequestEditor] Signed URL error:', signedUrlError);
          errors.push(`${file.name}: שגיאה ביצירת קישור לקובץ`);
          continue;
        }

        const signedUrl = signedUrlData.signedUrl;

        uploadedFiles.push({
          name: file.name, // Keep original name for display
          url: signedUrl,
          size: file.size,
          path: filePath
        });

        console.log('[RequestEditor] File uploaded successfully:', {
          name: file.name,
          path: filePath,
          signedUrl: signedUrl.substring(0, 100) + '...'
        });
      }

      // Update form data with successfully uploaded files
      if (uploadedFiles.length > 0) {
        setFormData(prev => ({
          ...prev,
          requestAttachments: [...prev.requestAttachments, ...uploadedFiles]
        }));

        toast({
          title: "קבצים הועלו בהצלחה",
          description: `${uploadedFiles.length} קבצים הועלו`,
        });

        // Auto-scroll to bottom to show new files
        setTimeout(() => {
          const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollArea) {
            scrollArea.scrollTop = scrollArea.scrollHeight;
          }
        }, 100);
      }

      // Show errors if any
      if (errors.length > 0) {
        const errorMsg = reportableError(
          'שגיאות בהעלאת קבצים',
          errors.join('\n'),
          { fileCount: files.length, projectId }
        );
        toast({
          title: "שגיאות בהעלאת קבצים",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[RequestEditor] Unexpected error:', error);
      const errorMsg = reportableError(
        'שגיאה',
        'אירעה שגיאה בהעלאת הקבצים',
        { error: error instanceof Error ? error.message : String(error), projectId }
      );
      toast({
        title: "שגיאה",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleFilePreview = async (file: UploadedFileMetadata) => {
    const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);
    
    try {
      // Temporarily disable auto-close before opening new window
      setCanAutoClose(false);
      
      // Regenerate fresh signed URL for preview
      let previewUrl = file.url;
      
      if (file.path) {
        const { data, error } = await supabase.storage
          .from('rfp-request-files')
          .createSignedUrl(file.path, 3600); // 1 hour for preview
        
        if (!error && data) {
          previewUrl = data.signedUrl;
        }
      }
      
      if (isImage) {
        window.open(previewUrl, '_blank');
      } else {
        // For other files, trigger download
        const link = document.createElement('a');
        link.href = previewUrl;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Re-enable auto-close after a short delay
      setTimeout(() => {
        setCanAutoClose(true);
      }, 500);
    } catch (error) {
      setCanAutoClose(true); // Re-enable even if there's an error
      console.error('[RequestEditor] Preview error:', error);
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
      // Delete from storage
      if (file.path) {
        console.log('[RequestEditor] Deleting file:', file.path);
        const { error } = await supabase.storage
          .from('rfp-request-files')
          .remove([file.path]);
        
        if (error) {
          console.error('[RequestEditor] Delete error:', error);
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
      console.error('[RequestEditor] Error removing attachment:', error);
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
    setIsOpen(false);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only allow closing if it's an explicit user action
        // Prevent auto-close from focus changes
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
      <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              עריכת בקשה
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              עריכת מייל הזמנה
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-280px)] overflow-y-auto mt-4" dir="rtl">
            <div className="pr-4">
              <TabsContent value="request" className="space-y-4 p-1">
              {/* Request Title */}
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="request-content" className="text-right block">תיאור הבקשה (טקסט חופשי)</Label>
                <Textarea
                  id="request-content"
                  value={formData.requestContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestContent: e.target.value }))}
                  rows={10}
                  className="text-right font-sans leading-relaxed"
                  dir="rtl"
                  placeholder="תאר את הפרויקט והדרישות שלך"
                />
                <p className="text-xs text-muted-foreground text-right">
                  תיאור זה יעזור ליועץ להבין את הצרכים שלך ולהציע הצעת מחיר מדויקת
                </p>
              </div>

              {/* File Attachments */}
              <div className="space-y-2">
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
                    <br />
                    <span className="text-primary">💡 לחץ על קובץ לתצוגה מקדימה</span>
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
                          className="group relative flex items-center gap-3 p-4 bg-muted hover:bg-muted/80 rounded-lg border border-border hover:border-primary/50 transition-all"
                          dir="rtl"
                        >
                          {/* File Icon or Thumbnail */}
                          {isImage ? (
                            <div className="w-12 h-12 rounded overflow-hidden bg-background flex-shrink-0">
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded bg-background flex items-center justify-center flex-shrink-0">
                              {isPDF ? (
                                <FileText className="h-6 w-6 text-red-500" />
                              ) : (
                                <Paperclip className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          
                          {/* File Info - Clickable Area */}
                          <button
                            type="button"
                            onClick={() => handleFilePreview(file)}
                            className="flex-1 text-right hover:text-primary transition-colors"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium line-clamp-1">{file.name}</span>
                              <div className="flex items-center gap-2 justify-end">
                                <Badge variant="outline" className="text-xs">
                                  {formatFileSize(file.size)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {isImage ? 'תמונה' : isPDF ? 'PDF' : 'קובץ'}
                                </span>
                              </div>
                            </div>
                          </button>
                          
                          {/* Preview Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFilePreview(file)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {/* Delete Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-right">
                  המידע שתזין כאן יהיה זמין ליועץ במערכת ניהוליסט לאחר הכניסה שלו
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="email" className="space-y-4 p-1">
              {/* Email Subject */}
              <div className="space-y-2">
                <Label htmlFor="email-subject" className="text-right block">נושא המייל</Label>
                <Input
                  id="email-subject"
                  value={formData.emailSubject}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailSubject: e.target.value }))}
                  className="text-right"
                  dir="rtl"
                  placeholder="נושא המייל שיישלח ליועצים"
                />
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <Label htmlFor="email-body" className="text-right block">תוכן המייל</Label>
                <Textarea
                  id="email-body"
                  value={formData.emailBody}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailBody: e.target.value }))}
                  rows={14}
                  className="text-right font-sans leading-relaxed"
                  dir="rtl"
                  placeholder="תוכן המייל שיישלח ליועצים"
                />
              </div>

              {/* Placeholders Info */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-right space-y-2">
                  <p className="font-semibold">תגיות זמינות:</p>
                  <ul className="text-sm space-y-1 mr-4">
                    <li>• <code className="bg-muted px-1 rounded">{"{{שם_הפרויקט}}"}</code> - שם הפרויקט</li>
                    <li>• <code className="bg-muted px-1 rounded">{"{{שם_המשרד}}"}</code> - שם משרד היועץ</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    תגיות אלו יוחלפו אוטומטית בערכים המתאימים בעת שליחת המייל
                  </p>
                </AlertDescription>
              </Alert>

              {/* Email Preview */}
              <div className="space-y-2">
                <Label className="text-right block">תצוגה מקדימה:</Label>
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="font-semibold mb-2 pb-2 border-b">
                    {formData.emailSubject.replace(/\{\{שם_הפרויקט\}\}/g, projectName)}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-right" dir="rtl">
                    {formData.emailBody
                      .replace(/\{\{שם_הפרויקט\}\}/g, projectName)
                      .replace(/\{\{שם_המשרד\}\}/g, '[שם המשרד]')}
                  </pre>
                </div>
              </div>
            </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex gap-2">
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
