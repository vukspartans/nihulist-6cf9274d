import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ToSAcceptanceModal = () => {
  const { profile, user } = useAuth();
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user needs to accept ToS
  useEffect(() => {
    if (profile && !profile.tos_accepted_at && user) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [profile, user]);

  const handleAccept = async () => {
    if (!tosAccepted) {
      toast.error("יש לאשר את תנאי השימוש");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tos_accepted_at: new Date().toISOString(),
          tos_version: '1.0'
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success("תנאי השימוש אושרו בהצלחה");
      setIsOpen(false);
      
      // Refresh the profile to update the UI
      window.location.reload();
    } catch (error) {
      console.error('Error accepting ToS:', error);
      toast.error("שגיאה באישור תנאי השימוש");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto" 
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-primary">
            תנאי שימוש - עדכון חשבון
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-right">
          <p className="text-sm text-muted-foreground text-center">
            על מנת להמשיך להשתמש במערכת, נדרש לאשר את תנאי השימוש המעודכנים
          </p>
          
          <TermsAndConditions 
            accepted={tosAccepted}
            onAcceptChange={setTosAccepted}
          />
          
          <Button
            onClick={handleAccept}
            disabled={!tosAccepted || loading}
            className="w-full h-11 text-base font-medium"
            variant="premium"
          >
            {loading ? "מעדכן..." : "אשר והמשך"}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            לא ניתן להמשיך להשתמש במערכת ללא אישור תנאי השימוש
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
