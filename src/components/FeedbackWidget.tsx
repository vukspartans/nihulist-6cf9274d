import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { MessageSquareHeart, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Ordered from worst (1) to best (5) - displayed reversed in RTL
const RATING_OPTIONS = [
  { value: 1, emoji: "🤢", label: "גרוע מאוד" },
  { value: 2, emoji: "😕", label: "לא טוב" },
  { value: 3, emoji: "😐", label: "בסדר" },
  { value: 4, emoji: "🙂", label: "טוב" },
  { value: 5, emoji: "🤩", label: "מצוין" },
];

// Dashboard routes where the feedback widget should be visible
const DASHBOARD_PATHS = [
  '/dashboard',
  '/projects',
  '/profile',
  '/advisor-dashboard',
  '/advisor-profile',
  '/submit-proposal',
  '/rfp-details',
  '/invite',
  '/negotiation',
  '/heyadmin'
];

const ATTENTION_DELAY_MS = 10 * 60 * 1000; // 10 minutes

export function FeedbackWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Only show on dashboard pages when user is logged in
  const isOnDashboard = DASHBOARD_PATHS.some(path => 
    location.pathname.startsWith(path)
  );

  // Set up attention animation timer after 10 minutes
  useEffect(() => {
    if (!user || !isOnDashboard) return;

    const timer = setTimeout(() => {
      setShouldAnimate(true);
    }, ATTENTION_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user, isOnDashboard]);

  // Reset animation when sheet is opened
  useEffect(() => {
    if (open) {
      setShouldAnimate(false);
    }
  }, [open]);

  if (!user || !isOnDashboard) {
    return null;
  }

  const handleSubmit = async () => {
    if (!rating) {
      toast({
        title: "נא לבחור דירוג",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("user_feedback").insert({
        rating,
        message: message.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        user_id: user?.id || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      toast({
        title: "תודה על המשוב! 🙏",
        description: "המשוב שלך התקבל בהצלחה",
      });

      // Reset form
      setRating(null);
      setMessage("");
      setEmail("");
      setPhone("");
      setOpen(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "שגיאה בשליחת המשוב",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "fixed left-0 top-1/2 -translate-y-1/2 z-50",
            "flex items-center gap-1.5 px-2 py-3",
            "bg-gradient-to-b from-primary to-primary-deep",
            "text-primary-foreground text-sm font-medium",
            "rounded-l-none rounded-r-lg",
            "shadow-lg hover:shadow-xl transition-all duration-300",
            "hover:translate-x-1",
            "border-r border-t border-b border-primary-glow/30",
            "writing-mode-vertical",
            shouldAnimate && "animate-attention-pulse"
          )}
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <MessageSquareHeart className="w-4 h-4 rotate-90" />
          <span>משוב</span>
        </button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-[340px] sm:w-[400px]">
        <SheetHeader className="text-right">
          <SheetTitle className="text-xl font-bold">
            איך הייתה החוויה?
          </SheetTitle>
          <SheetDescription>
            המשוב שלך עוזר לנו להשתפר
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* Rating Selection - flex-row-reverse for RTL: מצוין on right, גרוע מאוד on left */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">דרג את החוויה שלך</Label>
            <div className="flex flex-row-reverse justify-between gap-2">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRating(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200",
                    "hover:bg-muted hover:scale-110",
                    rating === option.value
                      ? "bg-primary/10 ring-2 ring-primary scale-110"
                      : "bg-muted/50"
                  )}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label htmlFor="feedback-message">
              מה הסיבה העיקרית לציון שנתתם?
            </Label>
            <Textarea
              id="feedback-message"
              placeholder="ספרו לנו על החוויה שלכם..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="feedback-email">
              כתובת אימייל{" "}
              <span className="text-muted-foreground">(לא חובה)</span>
            </Label>
            <Input
              id="feedback-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="feedback-phone">
              מספר טלפון{" "}
              <span className="text-muted-foreground">(לא חובה)</span>
            </Label>
            <Input
              id="feedback-phone"
              type="tel"
              placeholder="050-000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className="text-left"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !rating}
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                שליחה
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
