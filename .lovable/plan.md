

# Sanity Check: שלב 2.2 – רשימת חשבונות לתשלום ובקרה תקציבית

## סיכום כללי

מתוך 8 סעיפי המשנה במסמך האפיון, **5 מיושמים באופן מלא או כמעט מלא**, **2 מיושמים חלקית**, ו-**1 לא מיושם כלל**.

---

## מצב יישום לפי סעיף

### 2.1 חיבור משימות לאבני דרך תשלום -- IMPLEMENTED

| דרישה | סטטוס | הערות |
|--------|--------|-------|
| הגדרת אבני דרך מראש (אדמין) | Done | טבלת `payment_milestones` + ניהול אדמין |
| תנאי השלמה (משימות קריטיות) | Done | `is_payment_critical` flag בטבלת `project_tasks` |
| טריגר אוטומטי | Done | `trg_auto_unlock_milestone` -- DB trigger שמעביר ל-`due` |
| מניעת זיהוי בעיכוב | Done | רק כשכל הקריטיות `completed`/`cancelled` |
| הבדלה בין משימות תומכות לקריטיות | Done | Toggle "קריטי לתשלום" ב-`CreateTaskDialog` ו-`TaskDetailDialog` |
| קישור משימה-אבן דרך | Done | `payment_milestone_id` FK |
| התראה וזכאות | Done | Alert ירוק ב-`PaymentDashboard` + הודעה ב-`AdvisorPaymentsView` |

### 2.2 דרישת תשלום ליועצים -- IMPLEMENTED

| דרישה | סטטוס | הערות |
|--------|--------|-------|
| פתיחת דרישה רק אחרי זיהוי | Done | כפתור מושבת כש-`dueMilestones.length === 0`; ב-advisorMode מסנן `status === 'due'` |
| שיוך לאבן דרך אחת | Done | בורר אבן דרך בדיאלוג |
| סכום נגזר מהסכם | Done | Amount pre-filled מאבן הדרך |
| חריגה דורשת סימון והנמקה | Done | Alerts צהוב/אדום + notes חובה |
| טופס מובנה | Done | שם פרויקט (implicit), יועץ, אבן דרך, סכום, מע"מ, הערות |
| % ביצוע מצטבר | Done | עמודת `cumulative_percent` ב-`AdvisorPaymentsView` |
| צירוף קבצים | Done | `PaymentFileUpload` component + `invoice_file_url` |

**פער קטן**: הטופס לא מציג במפורש "שם פרויקט" ו"תחום יועץ" כשדות קריאה (הם מוצגים בטבלה אבל לא בדיאלוג עצמו). זה קוסמטי בלבד.

### 2.3 קליטה וניהול חשבונות חיצוניים -- NOT IMPLEMENTED

| דרישה | סטטוס | הערות |
|--------|--------|-------|
| חלופה 1: קליטה דרך מייל | Missing | אין מנגנון אימייל כניסה |
| חלופה 2: קליטה מתוך המערכת | Partial | יש קטגוריית `external` ב-`CreatePaymentRequestDialog` עם שדה "שם גורם חיצוני", אבל אין AI extraction |
| חילוץ נתונים AI | Missing | אין OCR/AI parsing לקבצי חשבון חיצוניים |
| שיוך לפרויקט | Done | כל בקשה משויכת לפרויקט |
| סיווג לקטגוריה | Partial | 3 קטגוריות קשיחות (consultant/external/other); אין קטגוריות אדמין דינמיות ולא AI-suggested |

**זהו הפער המשמעותי ביותר** -- המערכת לא תומכת בקליטת חשבונות חיצוניים עם חילוץ נתונים אוטומטי.

### 2.4 סטטוסים ותהליך אישור -- IMPLEMENTED

| דרישה | סטטוס | הערות |
|--------|--------|-------|
| שרשרת סטטוסים דינמית | Done | טבלת `payment_status_definitions` + `useApprovalChain` |
| הוספת תחנות אישור ע"י יזם | Done | ניהול אדמין ב-`PaymentStatusesManagement` |
| סדר קבוע (sequential) | Done | `display_order` + `getNextStep` |
| מנגנון התראות | Done | `notify-payment-status` edge function |
| חתימה דיגיטלית (checkbox/drawn) | Done | `ApprovePaymentDialog` + `SignatureCanvas` + `signatures` table |
| Timestamp לכל אישור | Done | `approved_at`, `submitted_at`, `paid_at` בציר הזמן |

**פער**: החתימה נשמרת בטבלת `signatures` אבל **לא מוטמעת על גבי המסמך המצורף** כפי שדורש האפיון ("החתימה וה-Timestamp יופיעו גם על המסמכים המצורפים"). הטמעה על PDF דורשת ספריית PDF manipulation בצד שרת.

### 2.5 מסך הנהלת חשבונות -- MOSTLY IMPLEMENTED

| דרישה | סטטוס | הערות |
|--------|--------|-------|
| לשונית 1: ריכוז יועצים | Done | `VendorConcentrationTab` -- expandable per vendor, paid YTD, outstanding |
| לשונית 2: ריכוז מנהלים | Partial | Tab "תזרים גלובלי" קיים, אבל לא מציג סיכום עמודות per-project כפי שמתואר |
| לשונית 3: רשימת חשבונות | Done | `LiabilitiesTab` עם סינון מתקדם |
| סינון לפי פרויקט, יועץ, סטטוס | Done | Filter bar מלא |
| סינון לפי תאריכים | Done | submitted + expected date ranges |
| סינון לפי סכום | Done | min/max |
| סינון חריגות | Done | "חריגות בלבד" toggle |
| צפייה במסמכים מצורפים | Partial | לא מוצג בלשונית הנה"ח; קיים רק ב-`PaymentRequestDetailDialog` |
| ייצוא היררכי (ZIP) | Missing | אין כפתור ייצוא עם מבנה תיקיות |
| עמודת "הוכר ע"י שמאי" | Missing | אין שדה DB ולא UI |

### 2.6 תזרים וצפי תשלומים -- IMPLEMENTED

| דרישה | סטטוס | הערות |
|--------|--------|-------|
| צפי תשלומים עתידי | Done | `CashFlowChart` ברמת פרויקט (צפי vs בפועל מצטבר) |
| דו"ח רוחבי | Done | `GlobalCashFlowTab` ב-`AccountantDashboard` -- 6 חודשים קדימה |

### 2.7 התראות -- IMPLEMENTED

| דרישה | סטטוס | הערות |
|--------|--------|-------|
| התראות על מועד טיפול | Done | `payment-deadline-reminder` edge function |
| התראות על חשבונות שלא אושרו | Done | `notify-payment-status` edge function |
| התראת חשבונית מס ליועץ | Done | Alert ב-`AdvisorPaymentsView` כש-`status === 'paid'` |

### 2.8 בדיקות QA -- NOT IMPLEMENTED

אין test files לרכיבי התשלום (לא unit tests ולא integration tests).

---

## סיכום פערים לפי עדיפות

### Priority 1 (פערים פונקציונליים משמעותיים)

1. **סעיף 2.3 -- קליטת חשבונות חיצוניים**: חסר flow מלא לקליטת חשבונות מגורמים חיצוניים עם AI extraction. היום רק אפשר ליצור בקשה "חיצונית" ידנית.

2. **ייצוא היררכי (ZIP)**: אין כפתור export שמוריד ריכוז + תיקיות מסמכים.

3. **עמודת "הוכר ע"י שמאי"**: חסר שדה DB (`appraiser_approved`) + UI. דורש גם role/permission לשמאי.

### Priority 2 (פערים טכניים)

4. **הטמעת חתימה על מסמכים**: החתימה נשמרת בנפרד אבל לא מוטמעת על ה-PDF המצורף. דורש PDF manipulation (edge function).

5. **לשונית "ריכוז מנהלים"**: הלשונית הקיימת מציגה תזרים גלובלי ולא סיכום per-project עם העמודות שמתוארות בסעיף 3 של המסמך.

6. **צפייה במסמכים מהטבלה**: בלשונית הנה"ח אין קישור ישיר לקבצים מצורפים; צריך לפתוח dialog פרטים.

### Priority 3 (שיפורים)

7. **קטגוריות דינמיות**: במקום 3 קטגוריות קשיחות (consultant/external/other), האפיון מבקש קטגוריות שהאדמין מגדיר.

8. **בדיקות QA**: אין tests כלל.

---

## המלצה

הנושאים ב-Priority 1 דורשים תכנון נפרד (בעיקר סעיף 2.3 שהוא מודול שלם). מומלץ לטפל ב-Priority 2 לפני שמתקדמים -- בפרט פריטים 5 ו-6 שהם שיפורי UI קטנים יחסית.

האם תרצה שאכין תוכנית יישום לאחד מהפערים הללו?
