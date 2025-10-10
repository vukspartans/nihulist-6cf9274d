import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminTranslations as t } from "@/constants/adminTranslations";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/auditLog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Advisor {
  id: string;
  user_id: string;
  company_name: string | null;
  location: string | null;
  founding_year: number | null;
  phone: string | null;
  profiles: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface EditAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisor: Advisor;
}

export function EditAdvisorDialog({ open, onOpenChange, advisor }: EditAdvisorDialogProps) {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (advisor) {
      setName(advisor.profiles?.name || "");
      setCompanyName(advisor.company_name || "");
      setPhone(advisor.profiles?.phone || "");
    }
  }, [advisor]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Update advisor record
      const { error: advisorError } = await supabase
        .from("advisors")
        .update({ company_name: companyName })
        .eq("id", advisor.id);

      if (advisorError) throw advisorError;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name, phone })
        .eq("user_id", advisor.user_id);

      if (profileError) throw profileError;
    },
    onSuccess: async () => {
      await logAdminAction("update", "advisors", advisor.id);
      queryClient.invalidateQueries({ queryKey: ["advisors"] });
      toast({
        title: t.advisors.messages.updated,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating advisor:", error);
      toast({
        title: t.advisors.messages.error,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.advisors.editDialog.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">{t.advisors.createDialog.nameLabel}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="edit-company">{t.advisors.createDialog.companyNameLabel}</Label>
            <Input
              id="edit-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="edit-phone">{t.advisors.createDialog.phoneLabel}</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.advisors.editDialog.cancelButton}
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t.common.loading : t.advisors.editDialog.submitButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
