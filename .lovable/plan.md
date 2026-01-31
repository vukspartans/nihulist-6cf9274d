

# סקירת מימוש - מערכת תבניות שכר טרחה היררכית

## סיכום מנהלים

סקרתי את כל המערכת לעומק ומצאתי שהיא **כמעט מלאה**, עם מספר פערים קטנים שדורשים השלמה.

---

## טבלת השוואה: דרישות מול מימוש

| דרישה | סטטוס | הערות |
|--------|--------|--------|
| **היררכיית צד מנהל** |
| Level 1: רשימת סוגי יועצים | ✅ מומש | `FeeTemplatesHierarchy.tsx` |
| Level 2: סוגי פרויקטים (תמ"א 38/1, 38/2...) | ✅ מומש | `FeeTemplatesByProject.tsx` |
| Level 3: קטגוריות (רישוי, הכנת מצגת...) | ✅ מומש | `FeeTemplateCategories.tsx` |
| Level 3: כפתור "ברירת מחדל" | ✅ מומש | `is_default` switch בכרטיס |
| Level 4: שיטות הגשה (פאושלי, כמותי, שעתי) | ✅ מומש | `FeeTemplateSubmissionMethods.tsx` |
| Level 4: כפתור "ברירת מחדל" לשיטה | ✅ מומש | כפתור toggle בממשק |
| Level 5: שורות סעיפים | ✅ מומש | טבלת Fee Items |
| **שירותים ואבני דרך** |
| שירותים תחת קטגוריה | ✅ מומש | `CategoryServicesTab.tsx` |
| אבני דרך תחת קטגוריה | ✅ מומש | `CategoryMilestonesTab.tsx` |
| DB: `category_id` על services/milestones | ✅ מומש | מיגרציה קיימת |
| **מדד (Index)** |
| רשימת 6 סוגי מדדים | ✅ מומש | `indexTypes.ts` |
| מדד ברירת מחדל לכל קטגוריה | ✅ מומש | `default_index_type` בDB |
| תצוגת מדד בכרטיס קטגוריה | ✅ מומש | עם אייקון TrendingUp |
| עריכת מדד קטגוריה | ✅ מומש | `EditFeeCategoryDialog.tsx` |
| **צד יזם - עריכת בקשה** |
| סדר טאבים: שירותים → שכ"ט → תשלום → ראשי | ✅ מומש | בקוד |
| ברירת מחדל "רשימת שירותים" (checklist) | ✅ מומש | בקוד |
| בחירת תבנית (קטגוריה) + שיטת הגשה | ✅ מומש | `ServiceDetailsTab.tsx` |
| טעינה אוטומטית של שירותים לפי קטגוריה | ✅ מומש | `loadTemplatesForCategory()` |
| כותרת דינמית: `{פרויקט} – בקשה ל...` | ✅ מומש | עם callback `onCategoryChange` |
| בחירת מדד בתשלום | ✅ מומש | `PaymentTermsTab.tsx` |
| ערך מדד בסיס + חודש | ✅ מומש | שדות קלט |
| **פערים שתוקנו** |
| שורות סעיפים מסוננות לפי `submission_method_id` | ✅ תוקן | `useFeeItemTemplates()` עם פרמטר נוסף |
| טעינת אבני דרך מתבנית לפי `category_id` | ✅ תוקן | `PaymentTermsTab.tsx` עם prop `categoryId` |
| מדד ברירת מחדל מהקטגוריה מועבר ל-`PaymentTermsTab` | ✅ תוקן | `onCategoryChange` מעביר `defaultIndexType` |

---

## פערים ותיקונים נדרשים

### 1. סינון שורות סעיפים לפי `submission_method_id`

**מצב נוכחי:** בדף `FeeTemplateSubmissionMethods.tsx` (שורה 73-80):
```typescript
const { data: feeItems } = useFeeItemTemplates(decodedAdvisorType);
// TODO: When items have submission_method_id, filter by that
const filteredItems = feeItems?.filter((item) => 
  item.advisor_specialty === decodedAdvisorType
) || [];
```

**נדרש:** סינון לפי `submission_method_id` במקום `advisor_specialty` בלבד.

**קבצים לעדכון:**
- `src/hooks/useRFPTemplatesAdmin.ts` - הוספת פרמטר `submissionMethodId`
- `src/pages/admin/FeeTemplateSubmissionMethods.tsx` - העברת `activeMethodId`

---

### 2. טעינת אבני דרך מתבנית לפי קטגוריה

**מצב נוכחי:** `PaymentTermsTab.tsx` שורות 84-98 טוען אבני דרך לפי `advisor_specialty` בלבד:
```typescript
if (advisorType) {
  query = query.or(`advisor_specialty.eq.${advisorType},advisor_specialty.is.null`);
}
```

**נדרש:** הוספת פרמטר `categoryId` וטעינה לפיו.

**קבצים לעדכון:**
- `src/components/rfp/PaymentTermsTab.tsx` - הוספת prop `categoryId` ושימוש ב-`.eq('category_id', categoryId)`

---

### 3. העברת מדד ברירת מחדל מקטגוריה לטאב תשלום

**מצב נוכחי:** ב-`RequestEditorDialog.tsx` קיים:
```typescript
<PaymentTermsTab
  paymentTerms={formData.paymentTerms || {}}
  onPaymentTermsChange={...}
  advisorType={advisorType}
  // defaultIndexType לא מועבר!
/>
```

**נדרש:** 
1. כאשר נבחרת קטגוריה ב-`ServiceDetailsTab`, יש לשמור את `default_index_type` שלה
2. להעביר אותו ל-`PaymentTermsTab` דרך prop `defaultIndexType`

**קבצים לעדכון:**
- `src/components/rfp/ServiceDetailsTab.tsx` - להחזיר גם `default_index_type` ב-`onCategoryChange`
- `src/components/RequestEditorDialog.tsx` - לשמור את ה-`indexType` ולהעביר ל-`PaymentTermsTab`

---

## סיכום ביצוע

| משימה | קבצים | מורכבות |
|--------|--------|----------|
| סינון fee items לפי submission_method | `useRFPTemplatesAdmin.ts`, `FeeTemplateSubmissionMethods.tsx` | נמוכה |
| טעינת milestones לפי category | `PaymentTermsTab.tsx` | נמוכה |
| העברת defaultIndexType מקטגוריה | `ServiceDetailsTab.tsx`, `RequestEditorDialog.tsx` | נמוכה |

---

## מה כבר עובד

### צד מנהל
- ✅ 5 רמות היררכיה מלאות
- ✅ יצירה, עריכה, מחיקה של קטגוריות
- ✅ יצירה ומחיקה של שיטות הגשה
- ✅ ניהול שירותים ואבני דרך לכל קטגוריה
- ✅ הגדרת מדד ברירת מחדל לכל קטגוריה
- ✅ סימון ברירת מחדל לקטגוריות ושיטות

### צד יזם
- ✅ סדר טאבים נכון (שירותים → שכ"ט → תשלום → ראשי)
- ✅ בחירת תבנית היררכית (קטגוריה → שיטה)
- ✅ טעינה אוטומטית של שירותים מהתבנית
- ✅ כותרת דינמית לפי שם הקטגוריה
- ✅ בחירת מדד ידנית בטאב תשלום
- ✅ הזנת ערך מדד בסיס

---

## סדר עבודה מומלץ

1. **תיקון סינון Fee Items** - כדי שמנהל יראה רק סעיפים ששייכים לשיטה הנבחרת
2. **העברת defaultIndexType** - כדי שהמדד יוגדר אוטומטית לפי הקטגוריה
3. **טעינת Milestones לפי Category** - כדי שאבני הדרך ייטענו מהתבנית הנכונה

