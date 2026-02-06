
# תכנית: הבחנה חזותית בין פריטי חובה ואופציונליים בטבלת הרחה

## סיכום השינויים

שלוש שיפורים ישירים ל-`src/components/proposal/ConsultantFeeTable.tsx`:

### 1. ייבוא Icons חדשים
הוספת `Shield` ו-`Info` מ-`lucide-react`:
```tsx
import { Plus, Trash2, AlertCircle, MessageSquare, Lock, Shield, Info } from 'lucide-react';
```

### 2. עדכון עיצוב שורות Entrepreneur (שורות 126-151)

**MUST items** (items.is_optional === false):
- רקע חם: `bg-amber-50/60 dark:bg-amber-950/30`
- בורדר עבה ימני: `border-r-4 border-r-amber-500`
- Icon: Shield בצבע amber
- Badge: "חובה" עם רקע amber
- טקסט: bold (`font-medium`)

**OPTIONAL items** (items.is_optional === true):
- רקע ניטרלי: `bg-slate-50/50 dark:bg-slate-900/20`
- בורדר דק ימני: `border-r-2 border-r-slate-300`
- Icon: Info בצבע slate
- Badge: "אופציונלי" עם רקע slate
- טקסט: normal weight

### 3. עדכון שורות Consultant-Added items (שורות 225-243)

הוספת אותה הבחנה לפריטים שהיועץ מוסיף בעצמו.

---

## קובץ לעדכון

`src/components/proposal/ConsultantFeeTable.tsx`

### שינוי 1: Imports (שורה 8)
```tsx
import { Plus, Trash2, AlertCircle, MessageSquare, Lock, Shield, Info } from 'lucide-react';
```

### שינוי 2: Entrepreneur items TableRow styling (שורות 128-133)
```tsx
<TableRow 
  key={itemId}
  className={cn(
    // MUST items - warm + thick border
    !item.is_optional && "bg-amber-50/60 dark:bg-amber-950/30 border-r-4 border-r-amber-500",
    // OPTIONAL items - neutral + thin border
    item.is_optional && "bg-slate-50/50 dark:bg-slate-900/20 border-r-2 border-r-slate-300",
    // Warning override for validation
    needsComment && "bg-orange-50 dark:bg-orange-950/20 border-r-orange-400"
  )}
>
```

### שינוי 3: Entrepreneur items description cell (שורות 138-150)
```tsx
<TableCell>
  <div className="flex items-center gap-2">
    {/* Icon based on type */}
    <Tooltip>
      <TooltipTrigger>
        {item.is_optional ? (
          <Info className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <Shield className="h-3.5 w-3.5 text-amber-600" />
        )}
      </TooltipTrigger>
      <TooltipContent>
        {item.is_optional ? 'פריט אופציונלי' : 'פריט חובה - מוגדר ע"י היזם'}
      </TooltipContent>
    </Tooltip>
    
    {/* Description text with weight based on type */}
    <span className={cn(
      !item.is_optional && "font-medium"
    )}>
      {item.description}
    </span>
    
    {/* Badge - always show, style based on type */}
    <Badge 
      className={cn(
        "text-xs shrink-0 ml-1",
        item.is_optional 
          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-200 dark:border-amber-700"
      )}
    >
      {item.is_optional ? 'אופציונלי' : 'חובה'}
    </Badge>
  </div>
</TableCell>
```

### שינוי 4: Consultant-added items TableRow (שורה 232)
```tsx
<TableRow 
  key={itemId} 
  className={cn(
    !item.is_optional && "bg-amber-50/60 dark:bg-amber-950/30 border-r-4 border-r-amber-500",
    item.is_optional && "bg-slate-50/50 dark:bg-slate-900/20 border-r-2 border-r-slate-300"
  )}
>
```

### שינוי 5: Consultant-added items description cell (שורות 236-243)
```tsx
<TableCell>
  <div className="flex items-center gap-2">
    {/* Icon based on type */}
    <Tooltip>
      <TooltipTrigger>
        {item.is_optional ? (
          <Info className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <Shield className="h-3.5 w-3.5 text-amber-600" />
        )}
      </TooltipTrigger>
      <TooltipContent>
        {item.is_optional ? 'פריט אופציונלי' : 'פריט חובה'}
      </TooltipContent>
    </Tooltip>
    
    <Input
      type="text"
      value={item.description}
      onChange={(e) => onUpdateAdditionalItem(index, 'description', e.target.value)}
      placeholder="תיאור הפריט"
      className={cn(
        "flex-1",
        !item.is_optional && "border-amber-300 focus:ring-amber-400",
        item.is_optional && "border-slate-300 focus:ring-slate-400"
      )}
    />
    
    {/* Badge - always show */}
    <Badge 
      className={cn(
        "text-xs shrink-0 whitespace-nowrap",
        item.is_optional 
          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
          : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-200 dark:border-amber-700"
      )}
    >
      {item.is_optional ? 'אופציונלי' : 'חובה'}
    </Badge>
  </div>
</TableCell>
```

---

## תוצאה חזותית

**MUST items** (חובה):
- 🛡️ Shield icon + amber
- `bg-amber-50/60` background
- `border-r-4 border-r-amber-500` thick right border
- `חובה` badge (amber background)
- **bold** text

**OPTIONAL items** (אופציונלי):
- ℹ️ Info icon + slate
- `bg-slate-50/50` background
- `border-r-2 border-r-slate-300` thin right border
- `אופציונלי` badge (slate background)
- normal text weight

---

## עקרונות עיצוב

✅ **ניגודיות** - WCAG AA compliant עבור כל הצבעים
✅ **RTL** - `border-r` לבורדר בצד ימין
✅ **Dark mode** - כל צבע עם וריאנט dark
✅ **Accessibility** - tooltips מסבירות כל icon
✅ **Zero guessing** - badges ברורים ותמיד נראים
✅ **וקטוריים** - Shield ו-Info קלים להבחנה אפילו בהדפס בשחור-לבן
