

# תוכנית יישום: לשונית ריכוז מנהלים + צפייה ישירה במסמכים

## סקירת מצב נוכחי

### פער 5 - ריכוז מנהלים
הלשונית "תזרים גלובלי" (`GlobalCashFlowTab`) מציגה **רק גרף עמודות** של צפי יציאות ל-6 חודשים. האפיון דורש **טבלת סיכום per-project** עם עמודות כמו: סה"כ הסכם, שולם, יתרת חוב, מספר חשבונות פתוחים -- ורק אז את הגרף.

### פער 6 - צפייה ישירה במסמכים
בטבלת ההתחייבויות (`LiabilitiesTab`) ובטבלת ריכוז ספקים (`VendorConcentrationTab`) אין שום חיווי או קישור לקבצים מצורפים. כדי לראות קובץ, צריך לפתוח dialog נפרד. בנוסף, ה-hook `useAccountantData` **לא שולף את השדה `invoice_file_url`** מה-DB כלל.

---

## שינויים מתוכננים

### 1. הוספת `invoice_file_url` ל-Data Layer

**קובץ: `src/hooks/useAccountantData.ts`**
- הוספת `invoice_file_url` ל-SELECT query של payment_requests
- הוספת השדה ל-interface `AccountantRequest`
- מיפוי השדה ב-mapping function

### 2. לשונית ריכוז מנהלים (Per-Project Summary)

**קובץ: `src/pages/AccountantDashboard.tsx`**

החלפת `GlobalCashFlowTab` בלשונית `ManagerSummaryTab` שתכלול:

**טבלת סיכום per-project:**

| עמודה | מקור |
|--------|------|
| שם פרויקט | `project_name` |
| מספר יועצים | distinct `project_advisor_id` per project |
| סה"כ חשבונות | count per project |
| חשבונות פתוחים | count where status != paid/rejected |
| סה"כ שולם | sum of paid requests |
| יתרת חוב פתוחה | sum of non-paid/rejected |
| צפי חודש נוכחי | requests with expected_payment_date in current month |

- הנתונים מחושבים client-side מתוך `allRequests` באמצעות `useMemo` -- קיבוץ לפי `project_id`
- שורת סיכום (totals) בתחתית הטבלה
- הגרף הקיים (6 חודשים) יישאר **מתחת לטבלה** כחלק מאותה לשונית

### 3. צפייה ישירה במסמכים מהטבלאות

**קובץ: `src/pages/AccountantDashboard.tsx`**

בשתי הטבלאות (LiabilitiesTab + VendorConcentrationTab):
- הוספת עמודה "קובץ" עם אייקון `Paperclip`
- כשיש `invoice_file_url` -- האייקון לחיץ ופותח signed URL בחלון חדש
- כשאין קובץ -- תא ריק (ללא אייקון)
- שימוש ב-`supabase.storage.from('payment-files').createSignedUrl()` ליצירת URL זמני

---

## פירוט טכני

### קבצים שישתנו

| קובץ | סוג שינוי |
|-------|-----------|
| `src/hooks/useAccountantData.ts` | הוספת `invoice_file_url` ל-interface, query ו-mapping |
| `src/pages/AccountantDashboard.tsx` | החלפת `GlobalCashFlowTab` ב-`ManagerSummaryTab`; הוספת עמודת קובץ ל-`LiabilitiesTab` ו-`VendorConcentrationTab` |

### לוגיקת Signed URL

פונקציית helper פנימית בקומפוננטה:

```text
async function openFileUrl(filePath: string) {
  const { data } = await supabase.storage
    .from('payment-files')
    .createSignedUrl(filePath, 300); // 5 min
  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
}
```

### מבנה ManagerSummaryTab

1. `useMemo` שמקבץ את `allRequests` לפי `project_id`
2. לכל פרויקט מחשב: advisorCount, totalRequests, openRequests, totalPaid, totalOutstanding, currentMonthForecast
3. מציג טבלה עם שורת totals
4. מתחת -- הגרף הקיים (6 חודשים) ללא שינוי

### שינוי שם Tab

- הטאב ישנה שם מ-"תזרים גלובלי" ל-"ריכוז מנהלים" עם אייקון `BarChart3` (נשאר אותו אייקון)

