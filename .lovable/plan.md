
# תיקון איבוד נתונים בעת מעבר בין טאבים - ניתוח מעמיק

## אבחון הבעיה

### מה קורה בפועל?
מהלוגים רואים:
```
[useAuth] Auth event: SIGNED_IN session: true
[RFPWizard] Restored state from sessionStorage
```

**הבעיה המרכזית**: כאשר חוזרים לטאב, Supabase שולח אירוע `SIGNED_IN` (לא `TOKEN_REFRESHED`). זה קורה כי:
1. הדפדפן "מעיר" את הטאב
2. Supabase מזהה שיש session ושולח `SIGNED_IN` 
3. התיקון הקודם תפס רק `TOKEN_REFRESHED` - לא `SIGNED_IN`!

### השתלשלות האירועים:
1. `useAuth` מקבל `SIGNED_IN` → מפעיל `setProfileLoading(true)` + `setRolesLoading(true)`
2. `loading` הופך ל-`true`
3. `ProtectedRoute` ו-`RoleBasedRoute` מציגים ספינר טעינה
4. כל עץ ה-React מתפרק (unmount) - כולל `RequestEditorDialog`!
5. אחרי הטעינה, הכל מורכב מחדש - אבל `RequestEditorDialog` נפתח ריק כי הוא לא שומר state

### למה `RFPWizard` נשמר אבל `RequestEditorDialog` לא?
- `RFPWizard` - **כן שומר** ב-sessionStorage (התיקון הקודם)
- `RequestEditorDialog` - **לא שומר** כלום! כל ה-state ב-`useState` בלבד

---

## פתרון מוצע

### 1. הרחבת התנאי ב-`useAuth` - לכלול גם `SIGNED_IN` חוזר

**בעיה**: גם `SIGNED_IN` מתקבל בחזרה לטאב, לא רק `TOKEN_REFRESHED`

**פתרון**: לבדוק אם כבר יש session ו-user לפני שמפעילים loading

```typescript
// src/hooks/useAuth.tsx
supabase.auth.onAuthStateChange((event, session) => {
  // Skip loading states if we already have the same user
  // This prevents reload when returning to tab
  if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && 
      session?.user?.id === user?.id && 
      user !== null) {
    console.log('[useAuth] Same user, skipping reload');
    setSession(session);
    return;
  }
  // ... rest of logic
});
```

### 2. הוספת שמירה אוטומטית ל-`RequestEditorDialog`

**בעיה**: גם אם נתקן את Auth, הדיאלוג צריך לשרוד unmount

**פתרון**: שמירה ל-sessionStorage בדומה ל-RFPWizard

```typescript
// RequestEditorDialog.tsx
const DIALOG_STORAGE_KEY = `request-editor-${projectId}-${advisorType}`;

// Save on every formData change
useEffect(() => {
  if (isOpen && formData) {
    sessionStorage.setItem(DIALOG_STORAGE_KEY, JSON.stringify({
      formData,
      isOpen: true,
      activeTab
    }));
  }
}, [formData, isOpen, activeTab]);

// Restore on mount
useEffect(() => {
  const saved = sessionStorage.getItem(DIALOG_STORAGE_KEY);
  if (saved) {
    const state = JSON.parse(saved);
    if (state.isOpen) {
      setFormData(state.formData);
      setActiveTab(state.activeTab || 'services');
      setIsOpen(true);
    }
  }
}, []);

// Clear on explicit close/save
const handleSave = async () => {
  sessionStorage.removeItem(DIALOG_STORAGE_KEY);
  // ... rest
};
```

---

## קבצים לעדכון

| קובץ | שינוי |
|------|-------|
| `src/hooks/useAuth.tsx` | תנאי מורחב: דלג גם על `SIGNED_IN` אם אותו user |
| `src/components/RequestEditorDialog.tsx` | שמירה/שחזור state מ-sessionStorage |

---

## תוצאה צפויה

1. ✅ `SIGNED_IN` בחזרה לטאב לא יגרום ל-loading
2. ✅ אם בכל זאת יש unmount, `RequestEditorDialog` ישוחזר
3. ✅ הדיאלוג יישאר פתוח עם כל הנתונים
4. ✅ שמירה תתבצע רק כש-dialog פתוח

---

## סדר מימוש

1. **תיקון `useAuth`** - קריטי, מונע את ה-unmount
2. **שמירה ב-`RequestEditorDialog`** - defense in depth, שומר גם אם יש unmount

---

## בדיקה לאחר התיקון

1. פתח פרויקט → לחץ "ערוך בקשה"
2. ערוך שדות (כותרת, תוכן)
3. עבור לטאב אחר
4. חזור לטאב המערכת
5. **תוצאה צפויה**: הדיאלוג נשאר פתוח עם כל הנתונים
