
# תיקון שליחת מייל מו"מ + שינויים ברשימת היועצים

## סיכום הבעיות והפתרונות

| # | בעיה | סיבה | פתרון |
|---|------|------|--------|
| 1 | יועץ לא מקבל מייל על בקשת תיקון הצעה | ה-edge function קורא לקומפוננטה כפונקציה במקום `React.createElement` | תיקון ל-`React.createElement` |
| 2 | שינויים ברשימת סוגי היועצים לפי שלב | חסרים סוגי יועצים / מיפוי שגוי | עדכון קובץ `advisorPhases.ts` ו-`advisor.ts` |

---

## תיקון 1: שליחת מייל מו"מ

### אבחון הבעיה
מהלוגים ב-`activity_log` ראינו:
```
action: negotiation_request_email_failed
error: "Objects are not valid as a React child (found: object with keys {$$typeof, type, key, ref, props, _owner, _store})"
```

**הסיבה:** ב-`send-negotiation-request/index.ts` נכתב:
```typescript
// ❌ שגוי - קריאה כפונקציה
await renderAsync(NegotiationRequestEmail({ ... }))
```

בעוד שב-`send-rfp-email/index.ts` (שעובד תקין):
```typescript
// ✅ נכון - שימוש ב-React.createElement
import React from 'npm:react@18.3.1'
await renderAsync(React.createElement(RFPInvitationEmail, { ... }))
```

### שינויים נדרשים

**קובץ: `supabase/functions/send-negotiation-request/index.ts`**

1. **הוספת import של React (שורה 5):**
```typescript
import React from "npm:react@18.3.1";
```

2. **תיקון הקריאה ל-renderAsync (שורות 395-407):**
```typescript
// לפני
const emailHtml = await renderAsync(
  NegotiationRequestEmail({ ... })
);

// אחרי
const emailHtml = await renderAsync(
  React.createElement(NegotiationRequestEmail, {
    advisorCompany,
    entrepreneurName: entrepreneurProfile?.name || "יזם",
    projectName: project.name,
    originalPrice: proposal.price,
    targetPrice: target_total,
    targetReductionPercent: target_reduction_percent,
    globalComment: global_comment,
    responseUrl,
    locale: "he",
  })
);
```

3. **תיקון מייל לחברי צוות (שורות 446-451):**
```typescript
// אותו שינוי - הקריאה הקיימת שולחת את אותו emailHtml כך שזה כבר מתוקן
```

### תיקון נוסף: `send-negotiation-response/index.ts`

יש לבדוק ולתקן גם את ה-edge function הזה באותו אופן (אם נדרש).

---

## תיקון 2: עדכון רשימת היועצים לפי שלב

### שינויים מבוקשים (לפי הדרישה)

| פעולה | יועץ | משלב | לשלב |
|-------|------|------|------|
| הסרה | יועץ פיתוח | 3 | (נמחק) |
| העברה | אדריכל נוף | 4 (אופציונלי) | 3 |
| שינוי שם | אדריכל נוף | - | אדריכל נוף ופיתוח |
| העברה | הדמיות | 4 | 3 |
| העברה | בדיקת אל הרס | 4 | 3 |
| העברה | בדיקת אפיון רשת | 4 | 3 |
| העברה | מכון התעדה (בניה ירוקה) | 4 | 3 |
| העברה + שינוי שם | יועץ אשפה | 4 | 3 (יועץ תברואה) |
| העברה | יועץ גז | 4 | 3 |
| **הוספה חדשה** | יועץ סביבתי | - | 3 |
| **הוספה חדשה** | יועץ CFD | - | 3 |
| **הוספה חדשה** | הסדרי תנועה | - | 3 |
| **הוספה חדשה** | התארגנות אתר | - | 3 |
| **הוספה חדשה** | פרסום תכנון ובניה | - | 3 |

### קבצים לעדכון

**1. קובץ: `src/constants/advisor.ts`**

הוספת סוגי יועצים חדשים למערך `ADVISOR_EXPERTISE`:
```typescript
// הוספות חדשות
'אדריכל נוף ופיתוח',  // במקום/בנוסף ל-'אדריכל נוף'
'יועץ תברואה',        // במקום/בנוסף ל-'יועץ אשפה'
'יועץ סביבתי',
'יועץ CFD',
'הסדרי תנועה',
'התארגנות אתר',
'פרסום תכנון ובניה',
```

עדכון `ADVISOR_EXPERTISE_CATEGORIES`:
```typescript
'סביבה ואנרגיה': [
  // ... קיים
  'יועץ סביבתי',
],
'תשתיות': [
  // ... קיים  
  'יועץ תברואה',
  'הסדרי תנועה',
  'התארגנות אתר',
],
'הנדסה': [
  // ... קיים
  'יועץ CFD',
],
'אדריכלות ותכנון': [
  // ... קיים
  'אדריכל נוף ופיתוח',
  'פרסום תכנון ובניה',
],
```

**2. קובץ: `src/constants/advisorPhases.ts`**

עדכון `ADVISOR_PHASES_BY_PROJECT_TYPE` לכל סוגי הפרויקטים:

```typescript
// עבור כל סוג פרויקט (למשל 'תמ"א 38 - פינוי ובינוי'):
{
  // Phase 1 - Must have
  'אדריכל': 1,
  'עורך דין מקרקעין': 1,
  'יועץ בדיקות (TEST)': 1,
  
  // Phase 2 - Important
  'אגרונום': 2,
  'מודד מוסמך': 2,
  
  // Phase 3 - Recommended
  'יועץ אינסטלציה': 3,
  'יועץ מיזוג אוויר': 3,
  'יועץ כבישים תנועה וחניה': 3,
  // 'יועץ פיתוח': 3,  ← הוסר
  'יועץ חשמל': 3,
  'יועץ קרקע': 3,
  'יועץ אקוסטיקה': 3,
  'יועץ בנייה ירוקה': 3,
  'יועץ איטום': 3,
  'יועץ בטיחות אש': 3,
  'יועץ קונסטרוקציה': 3,
  'יועץ נגישות': 3,
  'יועץ מיגון': 3,
  'יועץ מעליות': 3,
  'יועץ תרמי': 3,
  'יועץ הידרולוגיה': 3,
  'יועץ אלומיניום': 3,
  'יועץ קרינה': 3,
  'סוקר אסבסט': 3,
  
  // ✅ חדשים/מועברים לשלב 3
  'אדריכל נוף ופיתוח': 3,  // היה אדריכל נוף בשלב 4
  'הדמיות': 3,
  'בדיקת אל הרס': 3,
  'בדיקת אפיון רשת': 3,
  'מכון התעדה (בניה ירוקה)': 3,
  'יועץ תברואה': 3,  // היה יועץ אשפה
  'יועץ גז': 3,
  'יועץ סביבתי': 3,
  'יועץ CFD': 3,
  'הסדרי תנועה': 3,
  'התארגנות אתר': 3,
  'פרסום תכנון ובניה': 3,
}
```

**3. עדכון קובץ `src/lib/canonicalizeAdvisor.ts`**

הוספת מיפויים נוספים:
```typescript
const canonicalMap: Record<string, string> = {
  // ... קיים
  'יועץ אשפה': 'יועץ תברואה',
  'אדריכל נוף': 'אדריכל נוף ופיתוח',
};
```

---

## סיכום השינויים

| קובץ | שינוי |
|------|-------|
| `supabase/functions/send-negotiation-request/index.ts` | הוספת `import React`, שינוי ל-`React.createElement` |
| `supabase/functions/send-negotiation-response/index.ts` | בדיקה ותיקון אם נדרש |
| `src/constants/advisor.ts` | הוספת 7 סוגי יועצים חדשים |
| `src/constants/advisorPhases.ts` | הסרת יועץ פיתוח, הוספת יועצים לשלב 3 |
| `src/lib/canonicalizeAdvisor.ts` | מיפוי שמות ישנים לחדשים |

---

## בדיקות לאחר התיקון

1. **מייל מו"מ:** שליחת בקשת תיקון מיזם ליועץ → בדיקה ב-activity_log ש-`negotiation_request_email_sent` ולא `failed`
2. **שלב 3 יועצים:** בחירת יועצים בפרויקט מגורים → וידוא שהיועצים החדשים מופיעים בשלב 3
3. **Canonicalization:** וידוא ש-"יועץ אשפה" ממופה ל-"יועץ תברואה"
