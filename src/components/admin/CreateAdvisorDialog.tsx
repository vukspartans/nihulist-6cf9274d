import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminTranslations as t } from "@/constants/adminTranslations";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/auditLog";
const ISRAEL_CITIES = ["תל אביב", "ירושלים", "חיפה", "באר שבע", "רעננה"];
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdvisorDialog({ open, onOpenChange }: CreateAdvisorDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [officeSize, setOfficeSize] = useState("");
  const [position, setPosition] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [activityRegions, setActivityRegions] = useState<string[]>([]);
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
          role: "advisor",
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      const { data: { user: adminUser } } = await supabase.auth.getUser();

      // Create advisor record
      const { error: advisorError } = await supabase
        .from("advisors")
        .insert({
          user_id: authData.user.id,
          company_name: companyName,
          location,
          founding_year: foundingYear ? parseInt(foundingYear) : null,
          expertise,
          specialties,
          activity_regions: activityRegions,
          office_size: officeSize || null,
          position_in_office: position || null,
          is_active: true,
          admin_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: adminUser?.id || null,
        });

      if (advisorError) throw advisorError;

      // Update profile
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
      await logAdminAction("create", "advisors", userId, null, { email, name, role: "advisor", admin_approved: true });
      queryClient.invalidateQueries({ queryKey: ["advisors"] });
      toast({
        title: t.advisors.messages.created,
      });
      onOpenChange(false);
      // Reset form
      setEmail("");
      setPassword("");
      setName("");
      setCompanyName("");
      setPhone("");
      setLocation("");
      setFoundingYear("");
      setOfficeSize("");
      setPosition("");
      setExpertise([]);
      setSpecialties([]);
      setActivityRegions([]);
    },
    onError: (error) => {
      console.error("Error creating advisor:", error);
      toast({
        title: t.advisors.messages.error,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.advisors.createDialog.title}</DialogTitle>
          <DialogDescription>
            כל השדות המסומנים ב-* הם חובה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t.advisors.createDialog.emailLabel} *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.advisors.createDialog.emailPlaceholder}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">{t.advisors.createDialog.passwordLabel} *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.advisors.createDialog.passwordPlaceholder}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t.advisors.createDialog.nameLabel} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.advisors.createDialog.namePlaceholder}
                required
              />
            </div>

            <div>
              <Label htmlFor="companyName">{t.advisors.createDialog.companyNameLabel} *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t.advisors.createDialog.companyNamePlaceholder}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">{t.advisors.createDialog.phoneLabel}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.advisors.createDialog.phonePlaceholder}
              />
            </div>

            <div>
              <Label htmlFor="location">{t.advisors.createDialog.locationLabel} *</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue placeholder={t.advisors.createDialog.locationPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {ISRAEL_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="foundingYear">{t.advisors.createDialog.foundingYearLabel}</Label>
              <Input
                id="foundingYear"
                type="number"
                value={foundingYear}
                onChange={(e) => setFoundingYear(e.target.value)}
                placeholder={t.advisors.createDialog.foundingYearPlaceholder}
              />
            </div>

            <div>
              <Label htmlFor="officeSize">{t.advisors.createDialog.officeSizeLabel}</Label>
              <Select value={officeSize} onValueChange={setOfficeSize}>
                <SelectTrigger>
                  <SelectValue placeholder={t.advisors.createDialog.officeSizePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 עובדים</SelectItem>
                  <SelectItem value="6-10">6-10 עובדים</SelectItem>
                  <SelectItem value="11-20">11-20 עובדים</SelectItem>
                  <SelectItem value="21+">21+ עובדים</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="position">{t.advisors.createDialog.positionLabel}</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue placeholder={t.advisors.createDialog.positionPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">בעלים</SelectItem>
                  <SelectItem value="partner">שותף</SelectItem>
                  <SelectItem value="senior">בכיר</SelectItem>
                  <SelectItem value="employee">עובד</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t.advisors.createDialog.expertiseLabel} *</Label>
            <Textarea
              value={expertise.join(", ")}
              onChange={(e) => setExpertise(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              placeholder="אדריכל, מהנדס, קבלן..."
            />
          </div>

          <div>
            <Label>{t.advisors.createDialog.specialtiesLabel}</Label>
            <Textarea
              value={specialties.join(", ")}
              onChange={(e) => setSpecialties(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              placeholder="תכנון, פיקוח..."
            />
          </div>

          <div>
            <Label>{t.advisors.createDialog.activityRegionsLabel}</Label>
            <Select
              value={activityRegions.join(",")}
              onValueChange={(value) => setActivityRegions(value.split(",").filter(Boolean))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.advisors.createDialog.activityRegionsPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="north">צפון</SelectItem>
                <SelectItem value="center">מרכז</SelectItem>
                <SelectItem value="south">דרום</SelectItem>
                <SelectItem value="jerusalem">ירושלים</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.advisors.createDialog.cancelButton}
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!email || !password || !name || !companyName || !location || expertise.length === 0 || createMutation.isPending}
          >
            {createMutation.isPending ? t.common.loading : t.advisors.createDialog.submitButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
