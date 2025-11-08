import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { Upload, Download, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface BulkAdvisorUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedAdvisor {
  fullName: string;
  phone: string;
  companyName: string;
  email: string;
  expertise: string;
  valid: boolean;
  errors: string[];
}

export const BulkAdvisorUpload = ({ open, onOpenChange, onSuccess }: BulkAdvisorUploadProps) => {
  const [parsedData, setParsedData] = useState<ParsedAdvisor[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const csvContent = `שם מלא,מספר טלפון,שם משרד,כתובת אימייל,תחומי עיסוק
ישראל ישראלי,052-1234567,משרד ישראלי אדריכלים,israel@example.com,"אדריכל, עיצוב פנים"
שרה כהן,053-9876543,משרד כהן הנדסה,sara@example.com,יועץ קונסטרוקציה`;

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "תבנית_יועצים.csv";
    link.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      transformHeader: (header) => {
        const mapping: Record<string, string> = {
          'שם מלא': 'fullName',
          'מספר טלפון': 'phone',
          'שם משרד': 'companyName',
          'כתובת אימייל': 'email',
          'תחומי עיסוק': 'expertise'
        };
        return mapping[header] || header;
      },
      complete: (results) => {
        const validated = results.data.map((row: any) => {
          const errors: string[] = [];
          
          if (!row.fullName?.trim()) errors.push("שם מלא חסר");
          if (!row.phone?.trim()) errors.push("טלפון חסר");
          if (!row.companyName?.trim()) errors.push("שם משרד חסר");
          if (!row.email?.trim()) errors.push("אימייל חסר");
          if (!row.expertise?.trim()) errors.push("תחומי עיסוק חסרים");
          
          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (row.email && !emailRegex.test(row.email.trim())) {
            errors.push("אימייל לא תקין");
          }

          return {
            fullName: row.fullName?.trim() || "",
            phone: row.phone?.trim() || "",
            companyName: row.companyName?.trim() || "",
            email: row.email?.trim() || "",
            expertise: row.expertise?.trim() || "",
            valid: errors.length === 0,
            errors,
          };
        });

        setParsedData(validated);
        setResults(null);
        toast({
          title: "קובץ נטען בהצלחה",
          description: `נמצאו ${validated.length} שורות`,
        });
      },
      error: (error) => {
        toast({
          title: "שגיאה בקריאת הקובץ",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleUpload = async () => {
    const validAdvisors = parsedData.filter(a => a.valid);
    
    if (validAdvisors.length === 0) {
      toast({
        title: "אין יועצים תקינים להעלאה",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const response = await supabase.functions.invoke("bulk-create-advisors", {
        body: { advisors: validAdvisors },
      });

      if (response.error) {
        throw response.error;
      }

      setResults(response.data);
      setProgress(100);

      if (response.data.successful > 0) {
        toast({
          title: "העלאה הושלמה בהצלחה",
          description: `${response.data.successful} יועצים נוצרו, ${response.data.failed} נכשלו`,
        });
        onSuccess();
      } else {
        toast({
          title: "כל היועצים נכשלו",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error("Bulk upload error:", error);
      toast({
        title: "שגיאה בהעלאה",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadErrorReport = () => {
    if (!results || results.errors.length === 0) return;

    const csvContent = Papa.unparse(results.errors.map((err: any) => ({
      "שורה": err.row,
      "אימייל": err.email,
      "שגיאה": err.error,
    })));

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "שגיאות_העלאה.csv";
    link.click();
  };

  const validCount = parsedData.filter(a => a.valid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl">העלאת יועצים באצווה</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template */}
          <div>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="ml-2 h-4 w-4" />
              הורד תבנית CSV לדוגמה
            </Button>
          </div>

          {/* Upload Section */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              גרור קובץ CSV או לחץ לבחירה
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              disabled={processing}
            />
            <label htmlFor="csv-upload">
              <Button variant="outline" asChild disabled={processing}>
                <span>בחר קובץ CSV</span>
              </Button>
            </label>
          </div>

          {/* Preview */}
          {parsedData.length > 0 && !results && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">תצוגה מקדימה</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">✓ {validCount} תקינים</span>
                  {invalidCount > 0 && (
                    <span className="text-red-600">✗ {invalidCount} שגויים</span>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם מלא</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">משרד</TableHead>
                      <TableHead className="text-right">תחומי עיסוק</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((advisor, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{advisor.fullName}</TableCell>
                        <TableCell>{advisor.email}</TableCell>
                        <TableCell>{advisor.phone}</TableCell>
                        <TableCell>{advisor.companyName}</TableCell>
                        <TableCell className="text-xs">{advisor.expertise}</TableCell>
                        <TableCell>
                          {advisor.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-xs text-red-600">
                                {advisor.errors[0]}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {parsedData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  מציג 10 מתוך {parsedData.length} שורות
                </p>
              )}

              {invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    נמצאו {invalidCount} שורות עם שגיאות. רק השורות התקינות יעלו.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleUpload}
                disabled={processing || validCount === 0}
                className="w-full"
                size="lg"
              >
                {processing ? `מעלה... (${progress}%)` : `העלה ${validCount} יועצים`}
              </Button>

              {processing && <Progress value={progress} className="w-full" />}
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">תוצאות העלאה</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.successful}
                  </div>
                  <div className="text-sm text-muted-foreground">הצליחו</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.failed}
                  </div>
                  <div className="text-sm text-muted-foreground">נכשלו</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">
                    {results.totalRows}
                  </div>
                  <div className="text-sm text-muted-foreground">סה"כ</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {results.errors.length} יועצים נכשלו ביצירה
                    </AlertDescription>
                  </Alert>

                  <Button
                    variant="outline"
                    onClick={downloadErrorReport}
                    className="w-full"
                  >
                    <Download className="ml-2 h-4 w-4" />
                    הורד דוח שגיאות
                  </Button>
                </>
              )}

              <Button
                onClick={() => {
                  setParsedData([]);
                  setResults(null);
                  onOpenChange(false);
                }}
                className="w-full"
              >
                סגור
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
