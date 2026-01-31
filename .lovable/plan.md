
# תיקון רוחב שדה אחוז ושינוי שם טאב

## שינויים נדרשים

### 1. הרחבת שדה אחוז בטאב תשלום
**קובץ:** `src/components/rfp/PaymentTermsTab.tsx`

**הבעיה:** השדה של אחוז (%) חתוך - המספרים לא נראים במלואם
**הפתרון:** הרחבת רוחב העמודה והשדה

שינויים:
- שורה 179: שינוי grid מ-`grid-cols-[1fr_80px_40px]` ל-`grid-cols-[1fr_100px_40px]`
- שורה 193: שינוי grid מ-`grid-cols-[1fr_80px_40px]` ל-`grid-cols-[1fr_100px_40px]`
- שורה 209: שינוי רוחב Input מ-`w-14` ל-`w-16`
- שורה 231: שינוי grid מ-`grid-cols-[1fr_80px_40px]` ל-`grid-cols-[1fr_100px_40px]`

### 2. שינוי שם טאב "ראשי" ל"מידע וקבצים"
**קובץ:** `src/components/RequestEditorDialog.tsx`

**הבעיה:** שם הטאב "ראשי" לא מתאר את התוכן בצורה ברורה
**הפתרון:** שינוי לשם "מידע וקבצים" ואייקון מתאים

שינויים:
- שורה 816-819: 
  - החלפת אייקון מ-`Home` ל-`FolderOpen`
  - החלפת טקסט מ-"ראשי" ל-"מידע וקבצים"

---

## קוד לפני ואחרי

### PaymentTermsTab.tsx - רוחב grid

**לפני:**
```typescript
<div className="grid grid-cols-[1fr_80px_40px] gap-2 ...">
  <Input ... className="text-center h-8 w-14" />
```

**אחרי:**
```typescript
<div className="grid grid-cols-[1fr_100px_40px] gap-2 ...">
  <Input ... className="text-center h-8 w-16" />
```

### RequestEditorDialog.tsx - שם טאב

**לפני:**
```tsx
<TabsTrigger value="main" className="...">
  <Home className="h-4 w-4" />
  <span className="hidden sm:inline">ראשי</span>
</TabsTrigger>
```

**אחרי:**
```tsx
<TabsTrigger value="main" className="...">
  <FolderOpen className="h-4 w-4" />
  <span className="hidden sm:inline">מידע וקבצים</span>
</TabsTrigger>
```

---

## תוצאה צפויה

1. מספרי האחוזים יוצגו במלואם ללא חיתוך
2. שם הטאב ישקף טוב יותר את תוכנו (כותרת, תיאור, קבצים מצורפים)
3. אייקון התיקייה מתאים יותר לתוכן של מידע וקבצים
