

# מיון הצעות מחיר - ברירת מחדל מהזול ליקר עם אפשרות מיון

## סיכום

הוספת יכולת מיון להצעות המחיר בלשונית "הצעות שהתקבלו" עם:
- ברירת מחדל: מיון לפי מחיר מהזול ליקר
- אפשרויות מיון נוספות: מחיר (זול→יקר), מחיר (יקר→זול), סטטוס

---

## מצב נוכחי

### `src/components/ProposalComparisonTable.tsx` (שורות 126-137)

```typescript
// Sort proposals: accepted first, then by status priority
const sortedProposals = useMemo(() => {
  return [...proposals].sort((a, b) => {
    const statusOrder: Record<string, number> = { 
      'accepted': 0, 
      'resubmitted': 1, 
      'submitted': 2, 
      'negotiation_requested': 3, 
      'rejected': 4 
    };
    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
  });
}, [proposals]);
```

**בעיה:** המיון הנוכחי מתבסס רק על סטטוס, לא על מחיר.

---

## שינויים נדרשים

### קובץ: `src/components/ProposalComparisonTable.tsx`

**1. הוספת state למיון (אחרי שורה 89):**

```typescript
const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'status'>('price_asc');
```

**2. עדכון לוגיקת המיון (שורות 126-137):**

```typescript
// Sort proposals based on selected criteria
const sortedProposals = useMemo(() => {
  return [...proposals].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        // Sort by price ascending (cheapest first)
        return a.price - b.price;
      case 'price_desc':
        // Sort by price descending (most expensive first)
        return b.price - a.price;
      case 'status':
        // Sort by status priority
        const statusOrder: Record<string, number> = { 
          'accepted': 0, 
          'resubmitted': 1, 
          'submitted': 2, 
          'negotiation_requested': 3, 
          'rejected': 4 
        };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      default:
        return 0;
    }
  });
}, [proposals, sortBy]);
```

**3. הוספת UI למיון (לפני ה-Accordion, שורה 517):**

```tsx
{/* Sort Controls */}
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">מיון לפי:</span>
    <div className="flex gap-1">
      <Button
        variant={sortBy === 'price_asc' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSortBy('price_asc')}
        className="text-xs"
      >
        <ArrowUp className="w-3 h-3 ml-1" />
        מחיר (זול→יקר)
      </Button>
      <Button
        variant={sortBy === 'price_desc' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSortBy('price_desc')}
        className="text-xs"
      >
        <ArrowDown className="w-3 h-3 ml-1" />
        מחיר (יקר→זול)
      </Button>
      <Button
        variant={sortBy === 'status' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSortBy('status')}
        className="text-xs"
      >
        סטטוס
      </Button>
    </div>
  </div>
</div>
```

**4. הוספת imports (שורה 8):**

```typescript
import { Eye, Clock, Package, ChevronDown, ChevronUp, FileText, FileSignature, ArrowUp, ArrowDown } from 'lucide-react';
```

---

## סיכום השינויים

| שינוי | מיקום | תיאור |
|-------|-------|-------|
| State חדש | שורה ~90 | `sortBy` עם ברירת מחדל `'price_asc'` |
| לוגיקת מיון | שורות 126-137 | switch case לפי סוג המיון |
| UI מיון | לפני Accordion | 3 כפתורים לבחירת מיון |
| Imports | שורה 8 | `ArrowUp`, `ArrowDown` |

---

## תוצאה צפויה

1. **ברירת מחדל:** הצעות ממוינות מהזול ליקר
2. **כפתור "מחיר (זול→יקר)"** - מסומן כברירת מחדל
3. **כפתור "מחיר (יקר→זול)"** - מיון הפוך
4. **כפתור "סטטוס"** - מיון לפי סטטוס (אושר ראשון)
5. המיון פועל בתוך כל קבוצת סוג יועץ

