import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, FileText, Paperclip } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}

export const EmailPreviewDialog = ({ 
  advisorType, 
  projectName, 
  projectType,
  recipientCount,
  rfpContent 
}: EmailPreviewDialogProps) => {
  const defaultTitle = `הזמנה להצעת מחיר - ${projectName}`;
  const defaultContent = `שלום רב,

אנו מעוניינים לקבל הצעת מחיר עבור הפרויקט "${projectName}".

פרטי הפרויקט:
• סוג פרויקת: ${projectType}
• יועץ נדרש: ${advisorType}

אנא שלחו הצעת מחיר מפורטת הכוללת:
1. עלות השירות
2. לוחות זמנים משוערים
3. תנאי התקשרות

נשמח לקבל את הצעתכם בהקדם.

בברכה,
צוות הפרויקט`;

  const emailTitle = rfpContent?.title || defaultTitle;
  const emailContent = rfpContent?.content || defaultContent;
  const attachments = rfpContent?.attachments || [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          צפה באימייל
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            תצוגה מקדימה של האימייל
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="space-y-4 p-1">
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
              <label className="text-sm font-medium text-muted-foreground">נושא:</label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{emailTitle}</p>
              </div>
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">תוכן האימייל:</label>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {emailContent}
                </pre>
              </div>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">קבצים מצורפים:</label>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                      <Badge variant="outline" className="text-xs mr-auto">
                        {(file.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Notice */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                💡 זהו תצוגה מקדימה של האימייל שיישלח ל-{recipientCount} יועצים בקטגוריה "{advisorType}".
                תוכל לערוך את התוכן בשלב הבא.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
