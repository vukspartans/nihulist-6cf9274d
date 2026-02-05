

# תכנית: תיקונים ואימות

## סיכום הממצאים

### 1. יישור מספר ח.פ. בתוך שדה הקלט

| מיקום | סטטוס | הערה |
|-------|--------|------|
| תצוגה (קריאה בלבד) | ✅ | מיושר לימין עם `textAlign: 'right'` |
| שדה קלט (מצב עריכה) | ❌ | חסר יישור לימין - המספר מוצג משמאל בתוך השדה |

**תיקון נדרש**: הוספת `className="text-right"` לשדה הקלט של מספר ח.פ.

---

### 2. שינויי טקסונומיית יועצים

| בקשה | קובץ | סטטוס |
|------|------|--------|
| מחיקת "יועץ פיתוח" משלב 3 | `advisorPhases.ts` | ✅ לא קיים |
| העברת "אדריכל נוף ופיתוח" לשלב 3 | `advisorPhases.ts` (שורה 80) | ✅ |
| העברת "הדמיות" לשלב 3 | `advisorPhases.ts` (שורה 81) | ✅ |
| העברת "בדיקת אל הרס" לשלב 3 | `advisorPhases.ts` (שורה 82) | ✅ |
| העברת "בדיקת אפיון רשת" לשלב 3 | `advisorPhases.ts` (שורה 83) | ✅ |
| העברת "מכון התעדה (בניה ירוקה)" לשלב 3 | `advisorPhases.ts` (שורה 84) | ✅ |
| שינוי "יועץ אשפה" ל"יועץ תברואה" | `canonicalizeAdvisor.ts` (שורה 32) | ✅ |
| העברת "יועץ גז" לשלב 3 | `advisorPhases.ts` (שורה 86) | ✅ |
| הוספת "יועץ סביבתי" | `advisor.ts` (שורה 60) | ✅ |
| הוספת "יועץ CFD" | `advisor.ts` (שורה 61) | ✅ |
| הוספת "הסדרי תנועה" | `advisor.ts` (שורה 62) | ✅ |
| הוספת "התארגנות אתר" | `advisor.ts` (שורה 63) | ✅ |
| הוספת "פרסום תכנון ובניה" לשלב 3 | `advisorPhases.ts` (שורה 91) | ✅ |

**בעיה שנמצאה**: ה-Edge Function `update-advisors-data` עדיין מכיל שמות ישנים:
- `יועץ פיתוח` (במקום הסרה או מיפוי ל-`אדריכל נוף ופיתוח`)
- `יועץ אשפה` (במקום `יועץ תברואה`)
- `אדריכל נוף` (במקום `אדריכל נוף ופיתוח`)

**תיקון נדרש**: עדכון ה-Edge Function כך שישתמש בשמות הקנוניים החדשים.

---

### 3. ניתוח AI ידני בלבד

| רכיב | סטטוס | הערה |
|------|--------|------|
| `ProjectFilesManager.tsx` | ✅ | ניתוח רק דרך כפתור "נתח" ידני |
| `ProposalDetailDialog.tsx` | ✅ | ניתוח ידני בלבד |
| `RFPWizard.tsx` | ✅ | אין ניתוח אוטומטי |
| `evaluate-proposals-batch` | ✅ | ניתוח לצורך דירוג הצעות - חריג מותר |

הערה בקוד (שורה 139):
```javascript
// Note: AI analysis is now user-triggered only (via manual "Analyze" button)
```

**סטטוס**: ✅ מיושם כנדרש

---

## שינויים לביצוע

| # | קובץ | שינוי |
|---|------|-------|
| 1 | `src/components/OrganizationProfileTab.tsx` | הוספת `className="text-right"` לשדה הקלט של מספר ח.פ. |
| 2 | `supabase/functions/update-advisors-data/index.ts` | עדכון שמות יועצים לקנוניים |

---

## פרטים טכניים

### שינוי 1: יישור שדה מספר ח.פ.

בקובץ `OrganizationProfileTab.tsx` שורה 343:

**לפני:**
```tsx
<Input
  value={editedData.registration_number}
  onChange={(e) => setEditedData(prev => ({ ...prev, registration_number: e.target.value }))}
  placeholder="123456789"
  dir="ltr"
/>
```

**אחרי:**
```tsx
<Input
  value={editedData.registration_number}
  onChange={(e) => setEditedData(prev => ({ ...prev, registration_number: e.target.value }))}
  placeholder="123456789"
  dir="ltr"
  className="text-right"
/>
```

### שינוי 2: עדכון Edge Function

בקובץ `update-advisors-data/index.ts`:

**עדכון `required_categories` (שורות 11-25):**
- הסרה: `יועץ פיתוח`, `יועץ אשפה`, `אדריכל נוף`
- הוספה: `אדריכל נוף ופיתוח`, `יועץ תברואה`, `יועץ סביבתי`, `יועץ CFD`, `הסדרי תנועה`, `התארגנות אתר`, `פרסום תכנון ובניה`

**עדכון כל הפרויקטים ב-`projects` array:**
- החלפת `יועץ פיתוח` ב-`אדריכל נוף ופיתוח`
- החלפת `יועץ אשפה` ב-`יועץ תברואה`
- החלפת `אדריכל נוף` ב-`אדריכל נוף ופיתוח`

