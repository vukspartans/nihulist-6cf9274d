
# תיקון ניווט בפרופיל והסרת קבצים מלשונית השירותים

## סיכום הבעיות

| # | בעיה | סיבה | פתרון |
|---|------|------|-------|
| 1 | דף הפרופיל - אין כפתור חזרה ברור | רק לוגו מאפשר ניווט | הוספת כפתור "חזרה לדאשבורד" בולט |
| 2 | לשונית שירותים מציגה קבצים שלא קשורים | `allFiles` כולל את כל הקבצים | הצגת רק `serviceFile` בלשונית שירותים |

---

## בעיה 1: דף הפרופיל - אין כפתור חזרה

### מצב נוכחי
```tsx
// src/pages/Profile.tsx - שורות 758-764
<div className="sticky top-0 z-50 bg-background p-3 md:p-6 border-b">
  <div className="flex items-center justify-between gap-2">
    <NavigationLogo size="sm" className="flex-shrink-0" />
    <UserHeader />
  </div>
</div>
```

### פתרון
הוספת כפתור "חזרה לדאשבורד" בולט ליד הלוגו, בסגנון זהה לדף ה-Onboarding:

**שינויים:**
- ייבוא `ArrowRight` מ-lucide-react (שורה 14)
- עדכון ה-header להוספת כפתור (שורות 758-764)

**קוד חדש:**
```tsx
<div className="sticky top-0 z-50 bg-background p-3 md:p-6 border-b">
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-3">
      <NavigationLogo size="sm" className="flex-shrink-0" />
      <div className="h-6 w-px bg-border hidden sm:block" />
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => navigate(getDashboardRouteForRole(primaryRole))}
        className="gap-2"
      >
        <ArrowRight className="h-4 w-4" />
        <span className="hidden sm:inline">חזרה לדאשבורד</span>
        <span className="sm:hidden">חזרה</span>
      </Button>
    </div>
    <UserHeader />
  </div>
</div>
```

**הערה:** הכפתור משתמש ב-`getDashboardRouteForRole(primaryRole)` כדי לנווט לדאשבורד המתאים - `/dashboard` ליזם או `/advisor-dashboard` ליועץ.

---

## בעיה 2: לשונית שירותים מציגה קבצים לא רלוונטיים

### מצב נוכחי
ב-`ConsultantServicesSelection.tsx` שורות 110-126:
```tsx
const allFiles = useMemo(() => {
  const files = [];
  
  if (serviceFile) {
    files.push({ url: serviceFile.url, name: serviceFile.name, source: 'service' });
  }
  
  requestFiles.forEach((f, i) => {
    files.push({ url: f.url, name: f.name, source: 'request' }); // ❌ לא שייך לשירותים
  });
  
  projectFiles.forEach((f) => {
    files.push({ url: f.url, name: f.file_name, description: f.description, source: 'project' }); // ❌ לא שייך לשירותים
  });
  
  return files;
}, [serviceFile, requestFiles, projectFiles]);
```

### פתרון
הקבצים `requestFiles` ו-`projectFiles` כבר מוצגים בלשונית "פרטי הבקשה" (request tab). לכן בלשונית השירותים צריך להציג רק את `serviceFile`:

**שינויים ב-`ConsultantServicesSelection.tsx`:**

1. הסרת `projectFiles` ו-`requestFiles` מה-props (לא נדרשים יותר)
2. עדכון `allFiles` להכיל רק `serviceFile`

**קוד מעודכן:**
```tsx
// שורות 31-32 - הסרת props
// projectFiles?: ProjectFile[];  // הסרה
// requestFiles?: UploadedFileMetadata[];  // הסרה

// שורות 110-126 - עדכון allFiles
const allFiles = useMemo(() => {
  const files: Array<{ url: string; name: string; description?: string; source: string }> = [];
  
  if (serviceFile) {
    files.push({ url: serviceFile.url, name: serviceFile.name, source: 'service' });
  }
  
  // הוסרו requestFiles ו-projectFiles - הם מוצגים בלשונית "פרטי הבקשה"
  
  return files;
}, [serviceFile]);
```

**שינויים ב-`SubmitProposal.tsx`:**
- הסרת ה-props `projectFiles` ו-`requestFiles` מהקריאה ל-`ConsultantServicesSelection` (שורות 1195-1196)

**קוד מעודכן:**
```tsx
<ConsultantServicesSelection
  mode={entrepreneurData?.service_details_mode || 'free_text'}
  serviceItems={entrepreneurData?.service_scope_items || []}
  serviceText={entrepreneurData?.service_details_text || null}
  serviceFile={entrepreneurData?.service_details_file || null}
  selectedServices={selectedServices}
  onSelectionChange={setSelectedServices}
  consultantNotes={servicesNotes}
  onNotesChange={setServicesNotes}
  // הוסרו: projectFiles ו-requestFiles
/>
```

---

## סיכום השינויים

### קובץ 1: `src/pages/Profile.tsx`
1. הוספת `ArrowRight` לייבוא (שורה 14)
2. עדכון ה-header עם כפתור חזרה (שורות 758-764)
3. עדכון גם ה-loading state header (שורות 729-734)

### קובץ 2: `src/components/proposal/ConsultantServicesSelection.tsx`
1. הסרת props: `projectFiles` ו-`requestFiles`
2. עדכון `allFiles` memo להכיל רק `serviceFile`

### קובץ 3: `src/pages/SubmitProposal.tsx`
1. הסרת props `projectFiles` ו-`requestFiles` מ-`ConsultantServicesSelection`

---

## תוצאה צפויה

### בעיה 1 - פרופיל:
- כפתור "חזרה לדאשבורד" בולט ונגיש
- ניווט מותאם לתפקיד (יזם/יועץ)
- עיצוב עקבי עם שאר הדפים

### בעיה 2 - שירותים:
- לשונית "בחירת שירותים" מציגה רק תוכן הקשור לשירותים
- קבצי הבקשה וקבצי הפרויקט נשארים בלשונית "פרטי הבקשה"
- הפרדה ברורה בין סוגי המידע
