import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Save, FileText, Mail, Paperclip, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface AdvisorTypeRequestData {
  requestTitle: string;
  requestContent: string;
  requestAttachments: File[];
  emailSubject: string;
  emailBody: string;
  hasBeenReviewed: boolean;
  lastEditedAt?: Date;
}

interface RequestEditorDialogProps {
  advisorType: string;
  projectName: string;
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
  recipientCount,
  initialData,
  onSave,
  hasBeenReviewed = false
}: RequestEditorDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("request");
  
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      requestAttachments: [...prev.requestAttachments, ...files]
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requestAttachments: prev.requestAttachments.filter((_, i) => i !== index)
    }));
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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

          <ScrollArea className="max-h-[calc(90vh-240px)] mt-4">
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
                <Label htmlFor="request-content" className="text-right block">תיאור הבקשה</Label>
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
                  >
                    <Upload className="h-4 w-4 ml-2" />
                    העלה קבצים
                  </Button>
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    תוכל לצרף תוכניות, מפרטים, או מסמכים רלוונטיים (עד 10MB לקובץ)
                  </p>
                </div>
                
                {formData.requestAttachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {formData.requestAttachments.map((file, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                        dir="rtl"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 text-right">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(file.size / 1024).toFixed(1)} KB
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
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
