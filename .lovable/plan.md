

# פישוט ממשק מיון הצעות - אייקון מיון בכותרת עמודת המחיר

## סיכום

הסרת כפתורי המיון הנפרדים והחלפתם באייקון מיון לחיץ בכותרת עמודת "סה״כ מחיר" בטבלה.

---

## שינויים נדרשים

### קובץ: `src/components/ProposalComparisonTable.tsx`

**1. הסרת בלוק כפתורי המיון (שורות 532-563):**

מחיקת כל הבלוק:
```tsx
{/* Sort Controls */}
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-sm text-muted-foreground">מיון לפי:</span>
  ...
</div>
```

**2. עדכון כותרת עמודת המחיר (שורה 203):**

**לפני:**
```tsx
<TableHead className="text-right">סה״כ מחיר</TableHead>
```

**אחרי:**
```tsx
<TableHead className="text-right">
  <button
    onClick={cycleSortOrder}
    className="flex items-center gap-1 hover:text-primary transition-colors"
  >
    סה״כ מחיר
    {sortBy === 'price_asc' && <ArrowUp className="w-3 h-3" />}
    {sortBy === 'price_desc' && <ArrowDown className="w-3 h-3" />}
    {sortBy === 'status' && <ArrowUpDown className="w-3 h-3 text-muted-foreground" />}
  </button>
</TableHead>
```

**3. הוספת פונקציית מחזור מיון (אחרי שורה 88):**

```typescript
const cycleSortOrder = () => {
  setSortBy(prev => {
    if (prev === 'price_asc') return 'price_desc';
    if (prev === 'price_desc') return 'price_asc';
    return 'price_asc'; // מסטטוס חוזר לזול→יקר
  });
};
```

**4. עדכון imports (שורה 8):**

```tsx
import { Eye, Clock, Package, ChevronDown, ChevronUp, FileText, FileSignature, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
```

**5. פישוט ה-return (שורות 530-605):**

הסרת ה-wrapper `<div className="space-y-4">` המיותר כעת:

```tsx
return (
  <Accordion type="multiple" defaultValue={vendorTypes} className="space-y-4">
    ...
  </Accordion>
);
```

---

## לוגיקת המיון

| לחיצה | מצב נוכחי | מצב חדש |
|-------|-----------|---------|
| 1 | price_asc (ברירת מחדל) | price_desc |
| 2 | price_desc | price_asc |

האייקון משתנה בהתאם:
- `ArrowUp` = זול→יקר (ברירת מחדל)
- `ArrowDown` = יקר→זול

---

## תוצאה צפויה

1. **ממשק נקי יותר** - ללא כפתורים נפרדים
2. **אינטואיטיבי** - לחיצה על כותרת העמודה ממיינת
3. **ברירת מחדל** - מהזול ליקר עם חץ כלפי מעלה
4. **לחיצה נוספת** - מחליף כיוון (יקר→זול)

