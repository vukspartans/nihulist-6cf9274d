

# תכנית שיפורי UX: טבלת תמחור והגשת הצעות

## סיכום המשימה

שיפור הבהירות, ביטחון קבלת ההחלטות, והפחתת בלבול בשלב הגשת ההצעה - באמצעות עדכוני microcopy, היררכיה ויזואלית, ותוויות עזר.

---

## 1. עדכוני Microcopy - טקסטים חדשים

### כותרות וכותרות משנה

| מיקום | טקסט נוכחי | טקסט חדש | נימוק UX |
|-------|------------|----------|----------|
| כותרת טבלה | `פירוט פריטים (4)` | `פירוט שכר טרחה (4 פריטים)` | מדויק יותר - מבהיר שזה breakdown של עלויות |
| תיאור משנה | חסר | `הזן מחיר עבור כל פריט. פריטי חובה חייבים להיכלל בהצעה.` | מבהיר את הכלל הבסיסי מראש |

### כותרות עמודות

| עמודה נוכחית | עמודה חדשה | נימוק |
|--------------|------------|-------|
| `תיאור` | `השירות` | קצר וברור יותר |
| `כמות` | `כמות` | ללא שינוי |
| `יחידה` | `יחידת מדידה` | מדויק יותר למשתמשים לא טכניים |
| `מחיר` | `מחיר ליחידה` | מבהיר שזה per-unit |
| `יעד` | **להסיר** | לא ברור - מציג מחיר מקורי/מומלץ? מבלבל |
| `הנחה חדשה` | `הנחה (%)` | פשוט וברור |
| `סה"כ` | `סה"כ לפריט` | מבדיל מהסה"כ הכללי |

### תגיות חובה/אופציונלי

| סטטוס | תגית נוכחית | תגית חדשה | עיצוב |
|-------|-------------|-----------|-------|
| חובה | `חובה` | `🛡️ חובה` | Badge כתום בולט עם אייקון Shield |
| אופציונלי | `אופציונלי` | `ℹ️ אופציונלי - לבחירתך` | Badge אפור עם הסבר קצר |

---

## 2. הבחנה חזותית: חובה vs אופציונלי

### פריטי חובה (MUST)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🛡️ │ מבנה מרפאת אלופאתיה  │ קומפ' │ 1 │ ₪350 │ -30% │ ₪350   │
│    │ [Badge: חובה]        │       │   │      │      │        │
├──────────────────────────────────────────────────────────────────────┤
│ רקע: bg-amber-50/60 | בורדר ימני: border-r-4 border-r-amber-500    │
└──────────────────────────────────────────────────────────────────────┘
```

**סגנון:**
- רקע: `bg-amber-50/60` (צהוב-כתום עדין)
- בורדר ימני: `border-r-4 border-r-amber-500` (עבה ובולט)
- אייקון: `Shield` בצבע amber
- Badge: `bg-amber-100 text-amber-800 border border-amber-200`
- טקסט תיאור: `font-medium` (מודגש קלות)

### פריטי אופציונלי (OPTIONAL)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ℹ️ │ אבזור פנים              │ קומפ' │ 1 │ ₪2,500 │  -  │ ₪2,500 │
│    │ [Badge: אופציונלי]      │       │   │        │     │        │
├──────────────────────────────────────────────────────────────────────┤
│ רקע: bg-slate-50/50 | בורדר ימני: border-r-2 border-r-slate-300    │
└──────────────────────────────────────────────────────────────────────┘
```

**סגנון:**
- רקע: `bg-slate-50/50` (אפור ניטרלי)
- בורדר ימני: `border-r-2 border-r-slate-300` (דק יותר)
- אייקון: `Info` בצבע slate
- Badge: `bg-slate-100 text-slate-700 border border-slate-200`
- טקסט תיאור: `font-normal`

---

## 3. הסברי הנחות (Discount Explainer)

### Helper Text להנחות

**מיקום:** מעל הטבלה או כ-tooltip על עמודת "הנחה"

**טקסט:**
```
💡 הנחות מיוחדות: הנחות אלו הוצעו על ידי הקבלן כחלק מהמשא ומתן.
   המחיר המוצג הוא המחיר הסופי לאחר ההנחה.
```

**עיצוב:**
```tsx
<div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 mb-4 text-sm">
  <div className="flex items-start gap-2">
    <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
    <div>
      <p className="font-medium text-amber-800">לגבי ההנחות המוצגות</p>
      <p className="text-amber-700 text-xs mt-1">
        הנחות אלו הוצעו על ידי הספק במסגרת המשא ומתן. 
        העמודה "סה"כ לפריט" מציגה את המחיר הסופי לאחר ההנחה.
      </p>
    </div>
  </div>
</div>
```

---

## 4. שורת סיכום משופרת

### סיכום נוכחי vs מוצע

**לפני:**
```
סה"כ: ₪4,750 | 9% הנחה
```

**אחרי:**
```tsx
<TableFooter>
  {/* שורת סה"כ חובה */}
  <TableRow className="bg-amber-50/30">
    <TableCell colSpan={5} className="text-right font-medium">
      סה"כ פריטי חובה:
    </TableCell>
    <TableCell className="text-center font-bold text-amber-700">
      ₪2,250
    </TableCell>
  </TableRow>
  
  {/* שורת סה"כ אופציונלי (אם יש) */}
  <TableRow className="bg-slate-50/30">
    <TableCell colSpan={5} className="text-right font-medium text-slate-600">
      סה"כ פריטים אופציונליים:
    </TableCell>
    <TableCell className="text-center font-medium text-slate-600">
      ₪2,500
    </TableCell>
  </TableRow>
  
  {/* שורת סה"כ הצעה */}
  <TableRow className="bg-primary/10 border-t-2 border-primary">
    <TableCell colSpan={5} className="text-right font-bold text-lg">
      סה"כ הצעה:
    </TableCell>
    <TableCell className="text-center font-bold text-lg text-primary">
      ₪4,750
    </TableCell>
  </TableRow>
</TableFooter>
```

---

## 5. הדגשת "ערך מומלץ" (Best Value)

### Badge למחיר הנמוך ביותר

```tsx
{isLowestPrice && (
  <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs gap-1">
    <Star className="h-3 w-3" />
    המחיר הנמוך ביותר
  </Badge>
)}
```

### Highlight לשורה מומלצת

```tsx
<TableRow 
  className={cn(
    isRecommended && "ring-2 ring-green-400 ring-offset-1 bg-green-50/50"
  )}
>
```

---

## 6. Call to Action משופר

### כפתור הגשה נוכחי vs מוצע

**לפני:**
```tsx
<Button>שלח הצעה</Button>
```

**אחרי:**
```tsx
<div className="space-y-3 mt-6">
  {/* הסבר לפני הכפתור */}
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm" dir="rtl">
    <p className="font-medium text-blue-800 flex items-center gap-2">
      <AlertCircle className="h-4 w-4" />
      שים לב: זוהי הגשת הצעה רשמית
    </p>
    <p className="text-blue-700 text-xs mt-1">
      לחיצה על הכפתור תגיש את ההצעה ליזם. לא ניתן לבטל הגשה לאחר מכן.
    </p>
  </div>
  
  {/* כפתור ראשי */}
  <Button 
    className="w-full h-12 text-base font-bold gap-2 bg-primary hover:bg-primary/90"
    disabled={!isValid}
  >
    <Send className="h-5 w-5" />
    הגש הצעת מחיר רשמית
  </Button>
  
  {/* מידע משלים */}
  <p className="text-xs text-muted-foreground text-center">
    סה"כ להגשה: ₪{formatPrice(grandTotal)} (ללא מע"מ)
  </p>
</div>
```

---

## 7. קבצים לעדכון

| # | קובץ | שינויים |
|---|------|---------|
| 1 | `src/components/proposal/ConsultantFeeTable.tsx` | כותרות עמודות, helper text הנחות, סיכום משופר |
| 2 | `src/pages/SubmitProposal.tsx` | CTA משופר, הסבר הגשה רשמית |
| 3 | `src/components/ProposalApprovalDialog.tsx` | microcopy לפריטי חובה/אופציונלי |
| 4 | `src/components/ProposalComparisonTable.tsx` | Best value badge, tooltip להנחות |

---

## 8. סיכום שינויי Microcopy

### לטבלת שכ"ט (ConsultantFeeTable)

| אלמנט | טקסט נוכחי | טקסט חדש |
|-------|------------|----------|
| כותרת טבלה | - | `פירוט שכר טרחה` |
| תיאור משנה | - | `הזן מחיר ליחידה עבור כל פריט. פריטי חובה יכללו תמיד בהצעה.` |
| עמודה "מחיר ליחידה" | `מחיר` | `מחיר ליחידה (₪)` |
| עמודה "סה"כ" | `סה"כ` | `סה"כ לפריט` |
| שורת סה"כ | `סה"כ הצעה:` | `סה"כ הצעת מחיר:` |
| Tooltip חובה | `פריט מוגדר ע"י היזם` | `פריט חובה - חייב להיכלל בהצעה` |
| Tooltip אופציונלי | `פריט אופציונלי` | `פריט אופציונלי - הכללתו לבחירתך` |

### לכפתור הגשה (SubmitProposal)

| אלמנט | טקסט נוכחי | טקסט חדש |
|-------|------------|----------|
| כפתור | `שלח הצעה` | `הגש הצעת מחיר רשמית` |
| הסבר | - | `לחיצה תגיש את ההצעה ליזם. לא ניתן לבטל לאחר מכן.` |
| Footer | `* כל המחירים ללא מע"מ` | `* כל המחירים ללא מע"מ | הצעה תקפה ל-30 יום` |

### לדיאלוג אישור (ProposalApprovalDialog)

| אלמנט | טקסט נוכחי | טקסט חדש |
|-------|------------|----------|
| כותרת חובה | `פריטי חובה` | `פריטים כלולים (חובה)` |
| כותרת אופציונלי | `פריטים אופציונליים` | `פריטים נוספים לבחירה` |
| הסבר אופציונלי | `(בחר כדי להוסיף)` | `סמן פריטים להוספה לסכום הסופי` |

---

## 9. עקרונות עיצוב

- **ניגודיות**: WCAG AA compliant בכל הצבעים
- **RTL**: תמיכה מלאה עם `border-r` ו-`text-right`
- **Dark Mode**: כל צבע עם וריאנט dark
- **Accessibility**: tooltips מסבירות, תיוג ARIA
- **Zero Guessing**: badges ותוויות ברורות ותמיד נראות

