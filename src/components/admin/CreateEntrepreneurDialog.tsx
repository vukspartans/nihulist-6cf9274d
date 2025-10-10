import { useState } from "react";
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

interface CreateEntrepreneurDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEntrepreneurDialog({ open, onOpenChange }: CreateEntrepreneurDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          phone,
          company_name: companyName,
          role: "entrepreneur",
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Profile is created automatically via trigger, but we can update it if needed
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name,
          phone,
          company_name: companyName,
          email,
        })
        .eq("user_id", authData.user.id);

      if (profileError) throw profileError;

      return authData.user.id;
    },
    onSuccess: async (userId) => {
      await logAdminAction("create", "profiles", userId, null, { email, name, role: "entrepreneur" });
      queryClient.invalidateQueries({ queryKey: ["entrepreneurs"] });
      toast({
        title: t.entrepreneurs.messages.created,
      });
      onOpenChange(false);
      // Reset form
      setEmail("");
      setPassword("");
      setName("");
      setPhone("");
      setCompanyName("");
    },
    onError: (error) => {
      console.error("Error creating entrepreneur:", error);
      toast({
        title: t.entrepreneurs.messages.error,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>{t.entrepreneurs.createDialog.title}</DialogTitle>
          <DialogDescription>
            {t.entrepreneurs.createDialog.emailPlaceholder}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">{t.entrepreneurs.createDialog.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.entrepreneurs.createDialog.emailPlaceholder}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">{t.entrepreneurs.createDialog.passwordLabel}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.entrepreneurs.createDialog.passwordPlaceholder}
              required
            />
          </div>

          <div>
            <Label htmlFor="name">{t.entrepreneurs.createDialog.nameLabel}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.entrepreneurs.createDialog.namePlaceholder}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">{t.entrepreneurs.createDialog.phoneLabel}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.entrepreneurs.createDialog.phonePlaceholder}
            />
          </div>

          <div>
            <Label htmlFor="companyName">{t.entrepreneurs.createDialog.companyLabel}</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t.entrepreneurs.createDialog.companyPlaceholder}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!email || !password || !name || createMutation.isPending}
          >
            {createMutation.isPending ? t.common.loading : t.entrepreneurs.createDialog.submitButton}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.entrepreneurs.createDialog.cancelButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
