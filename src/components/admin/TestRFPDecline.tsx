import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Database } from '@/integrations/supabase/types';

type DeclineReason = Database['public']['Enums']['decline_reason_type'];

export const TestRFPDecline = () => {
  const [inviteId, setInviteId] = useState('');
  const [declineReason, setDeclineReason] = useState<DeclineReason>('no_capacity');
  const [declineNote, setDeclineNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const loadLatestInvite = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rfp_invites')
        .select('id, advisor_type, advisors(company_name), rfps(projects(name))')
        .in('status', ['sent', 'opened', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setInviteId(data.id);
        const advisor = data.advisors as any;
        const rfp = data.rfps as any;
        const project = rfp?.projects as any;
        
        toast({
          title: 'הזמנה נטענה',
          description: `${advisor?.company_name || 'יועץ'} - ${project?.name || 'פרויקט'}`,
        });
      }
    } catch (error: any) {
      console.error('Error loading invite:', error);
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testDecline = async () => {
    if (!inviteId) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא מזהה הזמנה',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // First, update the invite to declined status
      const { error: updateError } = await supabase
        .from('rfp_invites')
        .update({
          status: 'declined',
          decline_reason: declineReason,
          decline_note: declineNote || null,
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      // Then trigger the notification email
      const { data, error } = await supabase.functions.invoke('notify-rfp-declined', {
        body: {
          invite_id: inviteId,
          test_mode: true,
        },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: 'מייל נשלח בהצלחה!',
        description: `נשלח אל: ${data.recipient}`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'שגיאה בשליחת המייל',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>בדיקת מייל דחיית RFP</CardTitle>
        <CardDescription>
          בדוק את שליחת המייל ליזם כאשר יועץ דוחה הזמנת RFP.
          <br />
          <strong>כל המיילים נשלחים אל: lior+nihulist@spartans.tech</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-id">מזהה הזמנה (RFP Invite ID)</Label>
          <div className="flex gap-2">
            <Input
              id="invite-id"
              value={inviteId}
              onChange={(e) => setInviteId(e.target.value)}
              placeholder="הזן מזהה הזמנה או לחץ על 'טען הזמנה אחרונה'"
            />
            <Button
              onClick={loadLatestInvite}
              disabled={loading}
              variant="outline"
            >
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              טען הזמנה אחרונה
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="decline-reason">סיבת דחייה</Label>
          <Select value={declineReason} onValueChange={(value) => setDeclineReason(value as DeclineReason)}>
            <SelectTrigger>
              <SelectValue placeholder="בחר סיבת דחייה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no_capacity">אין זמינות כרגע</SelectItem>
              <SelectItem value="outside_expertise">מחוץ לתחום ההתמחות</SelectItem>
              <SelectItem value="timeline_conflict">קונפליקט בלוחות זמנים</SelectItem>
              <SelectItem value="budget_mismatch">אי התאמה תקציבית</SelectItem>
              <SelectItem value="other">סיבה אחרת</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="decline-note">הערת דחייה (אופציונלי)</Label>
          <Textarea
            id="decline-note"
            value={declineNote}
            onChange={(e) => setDeclineNote(e.target.value)}
            placeholder="הערות נוספות מהיועץ..."
            rows={3}
          />
        </div>

        <Button 
          onClick={testDecline} 
          disabled={loading || !inviteId}
          className="w-full"
        >
          {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
          דחה הזמנה ושלח מייל
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">תוצאה:</h3>
            <pre className="text-sm overflow-auto" dir="ltr">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
          <p><strong>הוראות:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>לחץ על "טען הזמנה אחרונה" או הזן מזהה הזמנה ידנית</li>
            <li>בחר סיבת דחייה והוסף הערה (אופציונלי)</li>
            <li>לחץ על "דחה הזמנה ושלח מייל"</li>
            <li>בדוק את המייל ב-lior+nihulist@spartans.tech</li>
            <li>בדוק את הלוגים בקישור למטה</li>
          </ol>
          <div className="pt-2">
            <a
              href="https://supabase.com/dashboard/project/aazakceyruefejeyhkbk/functions/notify-rfp-declined/logs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              📋 צפה בלוגים של notify-rfp-declined
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
