import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminTranslations as t } from "@/constants/adminTranslations";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/auditLog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Entrepreneur {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
}

interface EditEntrepreneurDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneur: Entrepreneur;
}

export function EditEntrepreneurDialog({ open, onOpenChange, entrepreneur }: EditEntrepreneurDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (entrepreneur) {
      setName(entrepreneur.name || "");
      setPhone(entrepreneur.phone || "");
      setCompanyName(entrepreneur.company_name || "");
    }
  }, [entrepreneur]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const oldValues = {
        name: entrepreneur.name,
        phone: entrepreneur.phone,
        company_name: entrepreneur.company_name,
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          phone,
          company_name: companyName,
        })
        .eq("id", entrepreneur.id);

      if (error) throw error;

      return oldValues;
    },
    onSuccess: async (oldValues) => {
      await logAdminAction(
        "update",
        "profiles",
        entrepreneur.id,
        oldValues,
        { name, phone, company_name: companyName }
      );
      queryClient.invalidateQueries({ queryKey: ["entrepreneurs"] });
      toast({
        title: t.entrepreneurs.messages.updated,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating entrepreneur:", error);
      toast({
        title: t.entrepreneurs.messages.error,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.entrepreneurs.editDialog.title}</DialogTitle>
          <DialogDescription>
            {entrepreneur.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">{t.entrepreneurs.createDialog.nameLabel}</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.entrepreneurs.createDialog.namePlaceholder}
            />
          </div>

          <div>
            <Label htmlFor="edit-phone">{t.entrepreneurs.createDialog.phoneLabel}</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.entrepreneurs.createDialog.phonePlaceholder}
            />
          </div>

          <div>
            <Label htmlFor="edit-companyName">{t.entrepreneurs.createDialog.companyLabel}</Label>
            <Input
              id="edit-companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t.entrepreneurs.createDialog.companyPlaceholder}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.entrepreneurs.editDialog.cancelButton}
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? t.common.loading : t.entrepreneurs.editDialog.submitButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
