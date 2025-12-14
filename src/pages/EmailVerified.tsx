import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const EmailVerified = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/auth?mode=login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-lg construction-card text-center">
        <CardHeader className="space-y-6">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            האימייל אומת בהצלחה!
          </CardTitle>
          <CardDescription className="text-lg">
            החשבון שלכם פעיל. כעת תוכלו להתחבר למערכת
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            תועברו לדף ההתחברות בעוד {countdown} שניות...
          </p>
          
          <Button 
            onClick={() => navigate("/auth?mode=login")}
            variant="premium"
            size="lg"
            className="w-full"
          >
            התחבר עכשיו
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerified;
