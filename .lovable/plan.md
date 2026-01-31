
# תיקון איבוד נתונים בעת מעבר בין טאבים - הושלם ✅

## מה תוקן

### 1. `useAuth.tsx` - מניעת reload מיותר
- הוספת `currentUserIdRef` לזיהוי אותו משתמש
- דילוג על loading states כאשר `SIGNED_IN` מתקבל לאותו user (מעבר טאב)
- מונע unmount מלא של עץ ה-React

### 2. `RequestEditorDialog.tsx` - שמירת state ב-sessionStorage  
- שמירה אוטומטית של `formData`, `isOpen`, `activeTab` בכל שינוי
- שחזור אוטומטי בעת mount (defense in depth)
- ניקוי sessionStorage בעת שמירה/ביטול/סגירה

## בדיקה

1. פתח פרויקט → לחץ "ערוך בקשה"
2. ערוך שדות (כותרת, תוכן)
3. עבור לטאב אחר בדפדפן
4. חזור לטאב המערכת
5. **תוצאה צפויה**: הדיאלוג נשאר פתוח עם כל הנתונים
