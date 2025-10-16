import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, FileText, Paperclip, Save, Edit3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface EmailPreviewDialogProps {
  advisorType: string;
  projectName: string;
  projectType: string;
  recipientCount: number;
  rfpContent?: {
    title: string;
    content: string;
    attachments?: File[];
  };
  onSave?: (title: string, content: string) => void;
}

export const EmailPreviewDialog = ({ 
  advisorType, 
  projectName, 
  projectType,
  recipientCount,
  rfpContent,
  onSave
}: EmailPreviewDialogProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const defaultTitle = 'בקשה להצעת מחיר {{שם_הפרויקט}}';
  const defaultContent = `שלום {{שם_המשרד}},

קיבלת אפשרות להגיש הצעת מחיר לפרויקט חדש דרך מערכת ניהוליסט – הפלטפורמה המחברת בין יזמים ליועצים ומנהלת את כל תהליך העבודה במקום אחד.

במערכת תוכלו:
✅ להגיש הצעות מחיר בצורה מסודרת.
✅ לעקוב אחרי סטטוס הפניות וההצעות שלך.
✅ לקבל התראות בזמן אמת על פניות חדשות מפרויקטים רלוונטיים.

כדי לצפות בפרטי הפרויקט ולהגיש הצעת מחיר –
היכנס/י עכשיו למערכת ניהוליסט ›

)אם זו הפעם הראשונה שלך – ההרשמה קצרה ולוקחת פחות מדקה(.

בהצלחה,
צוות ניהוליסט`;

  const [emailTitle, setEmailTitle] = useState(rfpContent?.title || defaultTitle);
  const [emailContent, setEmailContent] = useState(rfpContent?.content || defaultContent);
  const attachments = rfpContent?.attachments || [];

  // Replace placeholders for display only
  const displayTitle = emailTitle.replace(/\{\{שם_הפרויקט\}\}/g, projectName);
  const displayContent = emailContent
    .replace(/\{\{שם_הפרויקט\}\}/g, projectName)
    .replace(/\{\{שם_המשרד\}\}/g, '[שם המשרד]');

  const handleSave = () => {
    onSave?.(emailTitle, emailContent);
    setIsEditing(false);
    toast({
      title: "נשמר בהצלחה",
      description: "תוכן האימייל עודכן",
    });
  };

  const handleCancel = () => {
    setEmailTitle(rfpContent?.title || defaultTitle);
    setEmailContent(rfpContent?.content || defaultContent);
    setIsEditing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          צפה באימייל
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]" dir="rtl" aria-describedby="email-preview-desc">
        <p id="email-preview-desc" className="sr-only">
          תצוגה מקדימה של תוכן האימייל שיישלח ליועצים
        </p>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEditing ? 'עריכת תוכן האימייל' : 'תצוגה מקדימה של האימייל'}
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                ערוך
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="space-y-4 p-1" dir="rtl">
            {/* Email Metadata */}
            <div className="space-y-2 pb-4 border-b">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">קטגוריה:</span>
                <Badge variant="secondary">{advisorType}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">נמענים:</span>
                <Badge>{recipientCount} יועצים</Badge>
              </div>
            </div>

            {/* Email Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-title" className="text-right block">נושא:</Label>
              {isEditing ? (
                <Input
                  id="email-title"
                  value={emailTitle}
                  onChange={(e) => setEmailTitle(e.target.value)}
                  className="text-right"
                  dir="rtl"
                />
              ) : (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-semibold text-right">{displayTitle}</p>
                </div>
              )}
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <Label htmlFor="email-content" className="text-right block">תוכן האימייל:</Label>
              {isEditing ? (
                <Textarea
                  id="email-content"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={12}
                  className="text-right font-sans leading-relaxed resize-none"
                  dir="rtl"
                />
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-right" dir="rtl">
                    {displayContent}
                  </pre>
                </div>
              )}
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-right block">קבצים מצורפים:</Label>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Notice */}
            {!isEditing && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-900 dark:text-blue-100 text-right" dir="rtl">
                  💡 זהו תצוגה מקדימה של האימייל שיישלח ל-{recipientCount} יועצים בקטגוריה "{advisorType}".
                  לחץ על "ערוך" כדי לשנות את התוכן.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {isEditing && (
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              שמור שינויים
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
