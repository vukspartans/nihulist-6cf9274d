
# הוספת לחצן "חזרה לדאשבורד" בדף הגדרת פרופיל ארגון

## הבעיה
בדף הגדרת פרופיל ארגון (`/organization/onboarding`), המשתמש יכול לחזור לדאשבורד רק על ידי לחיצה על הלוגו - שזה לא ברור ולא אינטואיטיבי.

## הפתרון
הוספת לחצן ברור ובולט "חזרה לדאשבורד" בכותרת העליונה, בסגנון דומה לדפים אחרים במערכת (כמו NegotiationResponse).

## שינויים נדרשים

### קובץ: `src/pages/OrganizationOnboarding.tsx`

**מיקום:** כותרת עליונה (שורות 297-310)

**מצב נוכחי:**
```tsx
<div className="sticky top-0 z-50 bg-background border-b px-4 py-3">
  <div className="container mx-auto flex items-center justify-between">
    <NavigationLogo size="sm" />
    <Button 
      variant="ghost" 
      size="sm"
      onClick={handleSkip}
      disabled={isSubmitting}
    >
      השלם מאוחר יותר
    </Button>
  </div>
</div>
```

**מצב חדש:**
```tsx
<div className="sticky top-0 z-50 bg-background border-b px-4 py-3">
  <div className="container mx-auto flex items-center justify-between">
    <div className="flex items-center gap-3">
      <NavigationLogo size="sm" />
      <div className="h-6 w-px bg-border hidden sm:block" /> {/* Separator */}
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => navigate('/dashboard')}
        className="gap-2"
      >
        <ArrowRight className="h-4 w-4" />
        <span className="hidden sm:inline">חזרה לדאשבורד</span>
        <span className="sm:hidden">חזרה</span>
      </Button>
    </div>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={handleSkip}
      disabled={isSubmitting}
    >
      השלם מאוחר יותר
    </Button>
  </div>
</div>
```

**שינויים נוספים:**
- הוספת `ArrowRight` ל-imports (שורה 13) - כבר קיים בייבוא!

## תוצאה צפויה

| אלמנט | מיקום | סגנון |
|-------|-------|-------|
| לוגו | ימין | לחיץ, מפנה לדאשבורד |
| **לחצן חזרה** | ליד הלוגו (מימין) | `variant="outline"` עם חץ, בולט וברור |
| "השלם מאוחר יותר" | שמאל | `variant="ghost"`, משני |

**במובייל:** הטקסט יתקצר ל-"חזרה" בלבד לחיסכון במקום

## יתרונות
1. ✅ לחצן ברור ונוח לשימוש
2. ✅ עיצוב עקבי עם שאר הדפים במערכת
3. ✅ מותאם למובייל עם טקסט מקוצר
4. ✅ אייקון חץ בכיוון הנכון (RTL)
