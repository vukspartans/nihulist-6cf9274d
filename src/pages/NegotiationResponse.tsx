import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NegotiationResponseView } from '@/components/negotiation/NegotiationResponseView';
import { ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import NavigationLogo from '@/components/NavigationLogo';
import { UserHeader } from '@/components/UserHeader';

const NegotiationResponse = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId && user) {
      checkAuthorization();
    }
  }, [sessionId, user]);

  const checkAuthorization = async () => {
    if (!sessionId || !user) return;

    try {
      // Verify advisor owns this session
      const { data: advisor } = await supabase
        .from('advisors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!advisor) {
        setError('לא נמצא פרופיל יועץ');
        setAuthorized(false);
        return;
      }

      const { data: session, error: sessionError } = await supabase
        .from('negotiation_sessions')
        .select('consultant_advisor_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        setError('בקשת המשא ומתן לא נמצאה');
        setAuthorized(false);
        return;
      }

      if (session.consultant_advisor_id !== advisor.id) {
        setError('אין לך הרשאה לצפות בבקשה זו');
        setAuthorized(false);
        return;
      }

      setAuthorized(true);
    } catch (err: any) {
      console.error('[NegotiationResponse] Auth check error:', err);
      setError(err.message || 'שגיאה בבדיקת הרשאות');
      setAuthorized(false);
    }
  };

  const handleSuccess = () => {
    navigate('/advisor-dashboard');
  };

  const handleBack = () => {
    navigate('/advisor-dashboard');
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <NavigationLogo size="lg" />
            <div className="flex items-center gap-2">
              <UserHeader />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">טוען...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authorized || error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <NavigationLogo size="lg" />
            <div className="flex items-center gap-2">
              <UserHeader />
            </div>
          </div>
        </header>
        <div className="container max-w-2xl py-12 px-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <CardTitle>שגיאה</CardTitle>
              </div>
              <CardDescription>{error || 'אין גישה לבקשה זו'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/advisor-dashboard')} variant="outline">
                <ArrowRight className="w-4 h-4 ms-2" />
                חזרה לדשבורד
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <NavigationLogo size="lg" />
          <div className="flex items-center gap-2">
            <UserHeader />
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-6 px-4">
        <NegotiationResponseView
          sessionId={sessionId!}
          onSuccess={handleSuccess}
          onBack={handleBack}
        />
      </main>
    </div>
  );
};

export default NegotiationResponse;
