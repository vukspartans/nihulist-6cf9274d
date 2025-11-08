import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Loader2 } from 'lucide-react';

export const TestRFPEmail = () => {
  const [loading, setLoading] = useState(false);
  const [rfpId, setRfpId] = useState('');
  const [testEmail, setTestEmail] = useState('lior+nihulist@spartans.tech');
  const [result, setResult] = useState<string>('');
  const { toast } = useToast();

  const sendTestEmail = async () => {
    if (!rfpId.trim()) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין RFP ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult('');

    try {
      console.log('[TestRFPEmail] Sending test email for RFP:', rfpId);

      const { data, error } = await supabase.functions.invoke('send-rfp-email', {
        body: {
          rfp_id: rfpId,
          test_mode: true, // Always use test mode
        },
      });

      if (error) {
        console.error('[TestRFPEmail] Error:', error);
        throw error;
      }

      console.log('[TestRFPEmail] Response:', data);

      setResult(JSON.stringify(data, null, 2));

      toast({
        title: 'הצלחה!',
        description: `נשלחו ${data.sent || 0} אימיילים לכתובת ${testEmail}`,
      });
    } catch (error: any) {
      console.error('[TestRFPEmail] Fatal error:', error);
      
      setResult(`Error: ${error.message}`);
      
      toast({
        title: 'שגיאה',
        description: error.message || 'שליחת האימייל נכשלה',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestRFP = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rfps')
        .select('id, project_id, sent_at, projects(name)')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setRfpId(data.id);
        toast({
          title: 'נמצא RFP',
          description: `RFP אחרון: ${(data.projects as any)?.name || data.id}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא RFP במערכת',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          בדיקת שליחת אימייל RFP
        </CardTitle>
        <CardDescription>
          שלח אימייל בדיקה לכתובת: {testEmail}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rfp-id">RFP ID</Label>
          <div className="flex gap-2">
            <Input
              id="rfp-id"
              placeholder="הזן RFP ID או לחץ 'טען אחרון'"
              value={rfpId}
              onChange={(e) => setRfpId(e.target.value)}
              dir="ltr"
            />
            <Button
              type="button"
              variant="outline"
              onClick={fetchLatestRFP}
              disabled={loading}
            >
              טען אחרון
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-email">כתובת אימייל לבדיקה</Label>
          <Input
            id="test-email"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            disabled
            dir="ltr"
          />
        </div>

        <Button
          onClick={sendTestEmail}
          disabled={loading || !rfpId}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              שולח...
            </>
          ) : (
            <>
              <Mail className="ml-2 h-4 w-4" />
              שלח אימייל בדיקה
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-2">
            <Label>תוצאה:</Label>
            <Textarea
              value={result}
              readOnly
              className="font-mono text-sm"
              rows={10}
              dir="ltr"
            />
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p>💡 עצות לבדיקה:</p>
          <ul className="list-disc list-inside space-y-1 mr-4">
            <li>לחץ "טען אחרון" כדי לטעון את ה-RFP האחרון במערכת</li>
            <li>או הזן RFP ID ידנית מהמסד נתונים</li>
            <li>כל האימיילים יישלחו לכתובת הבדיקה בלבד</li>
            <li>בדוק את הלוגים של Edge Function לפרטים נוספים</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
