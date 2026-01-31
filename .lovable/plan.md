
# תיקון בעיית איפוס התהליך בעת מעבר בין טאבים

## תיאור הבעיה

כאשר המשתמש עובד על תהליך RFP (או כל תהליך אחר במערכת), מעבר לטאב אחר בדפדפן וחזרה גורם לאיפוס כל ההתקדמות. המערכת מראה "טוען..." ומאפסת את הטפסים.

---

## שורש הבעיה

נמצאו **3 גורמים עיקריים**:

| גורם | מיקום | השפעה |
|-------|--------|--------|
| React Query ברירת מחדל | `App.tsx` שורה 53 | `refetchOnWindowFocus: true` מפעיל refetch בחזרה לטאב |
| Supabase Auth Events | `useAuth.tsx` | `TOKEN_REFRESHED` מפעיל loading state מחדש |
| מצב RFPWizard לא נשמר | `RFPWizard.tsx` | כל ה-state נשמר ב-useState בלבד (אובד ב-unmount) |

---

## פתרון מוצע

### 1. הגדרת React Query לא לעשות refetch על focus

**קובץ: `src/App.tsx`**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // מניעת refetch בחזרה לטאב
      refetchOnReconnect: true,     // כן לעשות refetch בחזרה לאינטרנט
      retry: 1,
    },
  },
});
```

### 2. מניעת loading state מיותר ב-Auth

**קובץ: `src/hooks/useAuth.tsx`**

בעת קבלת `TOKEN_REFRESHED` event, לא לאפס את ה-loading states:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // Skip loading states for token refresh - session is still valid
  if (event === 'TOKEN_REFRESHED') {
    setSession(session);
    setUser(session?.user ?? null);
    return; // Don't trigger profile/roles reload
  }
  
  // ... rest of existing logic
});
```

### 3. שמירה אוטומטית של state ב-RFPWizard (אופציונלי - שיפור נוסף)

**קובץ: `src/components/RFPWizard.tsx`**

הוספת שמירה ל-sessionStorage למצב הוויזארד:

```typescript
// שמירה אוטומטית
useEffect(() => {
  const stateToSave = {
    currentStep,
    selectedAdvisors,
    selectedRecommendedAdvisors,
    requestDataByType
  };
  sessionStorage.setItem(`rfp-wizard-${projectId}`, JSON.stringify(stateToSave));
}, [currentStep, selectedAdvisors, selectedRecommendedAdvisors, requestDataByType]);

// שחזור בטעינה
useEffect(() => {
  const saved = sessionStorage.getItem(`rfp-wizard-${projectId}`);
  if (saved) {
    const state = JSON.parse(saved);
    setCurrentStep(state.currentStep || 1);
    setSelectedAdvisors(state.selectedAdvisors || []);
    // ...
  }
}, [projectId]);
```

---

## קבצים לשינוי

| קובץ | שינוי | עדיפות |
|------|--------|---------|
| `src/App.tsx` | הגדרת `refetchOnWindowFocus: false` ב-QueryClient | **קריטי** |
| `src/hooks/useAuth.tsx` | דילוג על loading states ב-TOKEN_REFRESHED | **קריטי** |
| `src/components/RFPWizard.tsx` | שמירה ל-sessionStorage | אופציונלי |

---

## סדר ביצוע

1. **תיקון React Query** - מונע את רוב ה-refetch הלא נחוצים
2. **תיקון Auth events** - מונע loading state מיותר
3. **שמירה ל-sessionStorage** - גיבוי נוסף למצב הוויזארד

---

## תוצאה צפויה

לאחר התיקון:
- ✅ מעבר בין טאבים לא יגרום לטעינה מחדש
- ✅ מצב הוויזארד יישמר
- ✅ Token refresh יתבצע ברקע ללא הפרעה
- ✅ הנתונים יישמרו גם אם יש reconnect

---

## הערות טכניות

- `refetchOnWindowFocus: false` הוא best practice לאפליקציות עם טפסים ארוכים
- Supabase `autoRefreshToken` ימשיך לעבוד ברקע
- `sessionStorage` נמחק רק כשסוגרים את הטאב (לא בעת refresh)
