import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisorId: string;
  editingMember?: {
    id: string;
    name: string;
    email: string;
    notification_preferences: string[];
  } | null;
  onSave: () => void;
}

const NOTIFICATION_OPTIONS = [
  { value: "all", label: "כל ההתראות", description: "יקבל את כל המיילים" },
  {
    value: "rfp_requests",
    label: "בקשות להצעות מחיר בלבד",
    description: "הזמנות חדשות ותזכורות דדליין",
  },
  {
    value: "updates",
    label: "עדכונים על הצעות בלבד",
    description: "אישורים ודחיות של הצעות",
  },
];

export const AddTeamMemberDialog = ({
  open,
  onOpenChange,
  advisorId,
  editingMember,
  onSave,
}: AddTeamMemberDialogProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState<string[]>(["all"]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingMember) {
      setName(editingMember.name);
      setEmail(editingMember.email);
      setPreferences(editingMember.notification_preferences);
    } else {
      setName("");
      setEmail("");
      setPreferences(["all"]);
    }
  }, [editingMember, open]);

  const handlePreferenceToggle = (value: string) => {
    if (value === "all") {
      // If "all" is selected, deselect others
      setPreferences(["all"]);
    } else {
      // Remove "all" if selecting specific preferences
      const newPreferences = preferences.includes(value)
        ? preferences.filter((p) => p !== value)
        : [...preferences.filter((p) => p !== "all"), value];

      // If no preferences selected, default to "all"
      setPreferences(newPreferences.length > 0 ? newPreferences : ["all"]);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "שגיאה",
        description: "אנא הזן כתובת מייל תקינה",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from("advisor_team_members")
          .update({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            notification_preferences: preferences,
          })
          .eq("id", editingMember.id);

        if (error) throw error;

        toast({
          title: "הצלחה",
          description: "פרטי חבר הצוות עודכנו בהצלחה",
        });
      } else {
        // Add new member
        const { error } = await supabase.from("advisor_team_members").insert({
          advisor_id: advisorId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          notification_preferences: preferences,
        });

        if (error) {
          if (error.code === "23505") {
            // Unique constraint violation
            toast({
              title: "שגיאה",
              description: "כתובת המייל כבר קיימת ברשימת הצוות",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }

        toast({
          title: "הצלחה",
          description: "חבר הצוות נוסף בהצלחה",
        });
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving team member:", error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לשמור את פרטי חבר הצוות",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingMember ? "עריכת חבר צוות" : "הוספת חבר צוות"}
          </DialogTitle>
          <DialogDescription>
            הזן את פרטי חבר הצוות ובחר אילו התראות הוא יקבל
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם מלא *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ישראל ישראלי"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">כתובת מייל *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="israel@company.com"
              disabled={saving}
            />
          </div>

          <div className="space-y-3">
            <Label>התראות שיקבל</Label>
            {NOTIFICATION_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-start gap-3 p-3 rounded-lg border">
                <Checkbox
                  id={option.value}
                  checked={preferences.includes(option.value)}
                  onCheckedChange={() => handlePreferenceToggle(option.value)}
                  disabled={saving}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={option.value}
                    className="cursor-pointer font-medium"
                  >
                    {option.label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "שומר..." : editingMember ? "עדכן" : "הוסף"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
