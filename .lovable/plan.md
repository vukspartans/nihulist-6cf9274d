

# אבחון ותיקון 4 בעיות שזוהו על ידי הלקוח

## סיכום הבעיות והפתרונות

| # | בעיה | סיבת שורש | פתרון |
|---|------|----------|-------|
| 1 | הגדרת פרופיל ביזם - נדרש לעדכן שוב | `needsOnboarding()` מחזיר `true` כי `organization_id` לא נטען מהפרופיל | תיקון לוגיקת הבדיקה והוספת מנגנון fallback |
| 2 | העלאת קבצים עד 10MB במקום 20MB | `FileUpload.tsx` משתמש ב-default של `10 * 1024 * 1024` | שינוי default ל-20MB |
| 3 | סימני שאלה במייל ליועץ | בעיית encoding של הטקסט `advisor_type` מבסיס הנתונים | הוספת fallback עם UTF-8 encoding |
| 4 | יועץ לא מקבל מייל על בקשה לתיקון הצעה (מו"מ) | אימייל נשלח! הבעיה כנראה בתיבה או spam | אימות והוספת logging מפורט |

---

## פירוט הבעיות והפתרונות

### בעיה 1: הגדרת פרופיל ביזם נדרשת שוב

**מה קורה?**
אחרי שהיזם משלים את תהליך ה-onboarding ב-`OrganizationOnboarding.tsx`, הוא מופנה ל-Dashboard, אבל שם הוא שוב מופנה ל-onboarding.

**סיבת השורש:**
ב-`useOrganization.ts` שורה 202-217, הפונקציה `needsOnboarding()` בודקת:
```typescript
const needsOnboarding = (): boolean => {
  if (!organization) {
    return true;  // <-- אם organization לא נטען עדיין, מחזיר true!
  }
  return !organization.onboarding_completed_at && !organization.onboarding_skipped_at;
};
```

**הבעיה:** 
1. אחרי יצירת ארגון, ה-`organization` state לא מתעדכן מיד
2. ה-`profile.organization_id` לא נטען מספיק מהר
3. בין הרענון לטעינת הארגון, `needsOnboarding()` מחזיר `true` ושולח את המשתמש בחזרה

**פתרון:**
- הוספת בדיקה שממתינה לסיום loading לפני הפנייה
- שימוש ב-`sessionStorage` לסמן שהמשתמש סיים onboarding בסשן הנוכחי
- עדכון `useOrganization` לעשות refetch אחרי יצירת ארגון

**קבצים לעדכון:**
- `src/hooks/useOrganization.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/OrganizationOnboarding.tsx`

---

### בעיה 2: העלאת קבצים מוגבלת ל-10MB במקום 20MB

**מה קורה?**
המשתמש לא יכול להעלות קבצים מעל 10MB למרות שרשום "עד 20MB".

**סיבת השורש:**
ב-`FileUpload.tsx` שורה 31-32:
```typescript
export function FileUpload({
  maxSize = 10 * 1024 * 1024, // 10 MB  <-- כאן הבעיה!
```

למרות ש-`securityValidation.ts` מאפשר 20MB (שורה 139):
```typescript
const maxFileSize = 20 * 1024 * 1024; // 20MB per file
```

**פתרון:**
שינוי ה-default ל-20MB ועדכון כל המקומות שמשתמשים ברכיב.

**קבצים לעדכון:**
- `src/components/FileUpload.tsx` - שינוי default מ-10MB ל-20MB
- `src/components/negotiation/NegotiationDialog.tsx` - כבר משתמש ב-10MB, צריך עדכון

---

### בעיה 3: סימני שאלה במייל על הצעה ("ביועץ")

**מה קורה?**
כשהיזם מקבל מייל על הצעה חדשה, יש סימני שאלה במקום הטקסט "יועץ".

**סיבת השורש:**
ב-`notify-proposal-submitted/index.ts` שורות 88-99:
```typescript
let advisorType = 'יועץ';  // Fallback בעברית
if (proposal.rfp_invite_id) {
  const { data: rfpInvite } = await supabase
    .from('rfp_invites')
    .select('advisor_type')
    .eq('id', proposal.rfp_invite_id)
    .single();
  if (rfpInvite?.advisor_type) {
    advisorType = rfpInvite.advisor_type;  // ערך מבסיס הנתונים
  }
}
```

**אפשרויות:**
1. הערך `advisor_type` בבסיס הנתונים מכיל תו פגום
2. ה-email template לא מטפל נכון ב-UTF-8
3. Resend חותך את התווים

**בדיקת הטמפלייט:**
ב-`proposal-submitted.tsx` שורה 37:
```tsx
<Text style={paragraph}>
  קיבלת הצעת מחיר חדשה לפרויקט "{projectName}" מאת {advisorCompany} ({advisorType}).
</Text>
```

**פתרון:**
1. הוספת logging של הערך לפני שליחה
2. וידוא שה-`advisor_type` מגיע עם encoding נכון
3. ברירת מחדל אם הערך ריק או פגום

**קבצים לעדכון:**
- `supabase/functions/notify-proposal-submitted/index.ts`

---

### בעיה 4: יועץ לא מקבל מייל על בקשה לתיקון הצעה (מו"מ)

**מה קורה?**
כשהיזם מבקש מהיועץ לתקן את ההצעה (משא ומתן), היועץ לא מקבל מייל.

**בדיקת הקוד:**
ב-`send-negotiation-request/index.ts` שורות 386-476, **האימייל כן נשלח!**:
```typescript
// Send email to consultant (non-blocking)
if (advisorEmail) {
  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: "Billding <notifications@billding.ai>",
      to: advisorEmail,
      subject: `בקשה לעדכון הצעת מחיר - ${project.name}`,
      html: emailHtml,
    });
    console.log("[Negotiation Request] Email sent to:", advisorEmail);
```

**אפשרויות לבעיה:**
1. האימייל הולך ל-spam
2. `advisorProfile?.email` הוא `null` אז הלוגיקה לא נכנסת
3. יש שגיאה שנתפסת ב-catch אבל לא מוצגת למשתמש

**פתרון:**
1. בדיקת לוגים ב-`activity_log` לאירועים:
   - `negotiation_request_email_sent` - אם קיים, האימייל נשלח
   - `negotiation_request_email_failed` - אם קיים, יש שגיאה
2. הוספת התראה למשתמש אם שליחת האימייל נכשלת
3. שיפור הלוגים

**קבצים לעדכון:**
- `supabase/functions/send-negotiation-request/index.ts` - שיפור logging

---

## סדר עדיפות למימוש

| עדיפות | בעיה | סיבה |
|--------|------|------|
| 🔴 גבוהה | 2 - מגבלת 10MB | השפעה ישירה על UX, תיקון פשוט |
| 🔴 גבוהה | 1 - Redirect loop | חווית משתמש שבורה לחלוטין |
| 🟡 בינונית | 3 - סימני שאלה | בעיה ויזואלית במייל |
| 🟡 בינונית | 4 - מייל מו"מ | דורש חקירה נוספת |

---

## שינויים טכניים

### 1. FileUpload.tsx - הגדלת מגבלה ל-20MB
```typescript
// שורה 31-32
export function FileUpload({
  maxSize = 20 * 1024 * 1024, // 20 MB (במקום 10)
```

### 2. useOrganization.ts - מניעת Redirect מוקדם
```typescript
// הוספה בשורה ~70
// Add session storage check for just-completed onboarding
const justCompletedOnboarding = sessionStorage.getItem('onboarding_just_completed') === 'true';

const needsOnboarding = (): boolean => {
  if (!profile || (profile as any).role !== 'entrepreneur') {
    return false;
  }
  
  // User just completed onboarding in this session
  if (justCompletedOnboarding) {
    return false;
  }
  // ... rest of logic
};
```

### 3. OrganizationOnboarding.tsx - סימון סיום onboarding
```typescript
// בתוך handleComplete, לפני navigate:
sessionStorage.setItem('onboarding_just_completed', 'true');
navigate('/profile', { replace: true });
```

### 4. notify-proposal-submitted - טיפול בencoding
```typescript
// שורה 88-99
let advisorType = 'יועץ';
if (proposal.rfp_invite_id) {
  const { data: rfpInvite } = await supabase
    .from('rfp_invites')
    .select('advisor_type')
    .eq('id', proposal.rfp_invite_id)
    .single();
  
  // Validate the advisor_type is a valid string
  if (rfpInvite?.advisor_type && typeof rfpInvite.advisor_type === 'string' && rfpInvite.advisor_type.trim()) {
    advisorType = rfpInvite.advisor_type;
  }
  console.log('[Proposal Submitted] advisorType:', advisorType);
}
```

---

## בדיקות לאחר התיקון

1. ✅ בעיה 1: יצירת יזם חדש → השלמת onboarding → וידוא שלא מופנה שוב
2. ✅ בעיה 2: העלאת קובץ של 15MB → וידוא שהעלאה מצליחה
3. ✅ בעיה 3: שליחת הצעה → בדיקת מייל שאין בו סימני שאלה
4. ✅ בעיה 4: שליחת בקשת מו"מ → בדיקת לוגים + קבלת מייל

