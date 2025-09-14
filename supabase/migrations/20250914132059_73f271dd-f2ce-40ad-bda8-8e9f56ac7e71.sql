-- Update the incorrect AI analysis for the platform specification document
UPDATE project_files 
SET ai_summary = 'TL;DR
המסמך הוא מפרט טכני לפיתוח פלטפורמה דיגיטלית שמחברת בין יזמים ליועצים בתחום הבנייה, לצורך ניהול פרויקטים, תקשורת ותשלומים בהשראת מערכת Monday.com.

נקודות עיקריות:
• מטרות המערכת: חיפוש חכם וקישור בין יזמים ליועצים, ניהול תהליכים ותזמון, שיפור שקיפות ושליטה בתזרימים לאורך חיי הפרויקט
• פרסונות משתמשים: יזמים (בן דוד, 42, בעל חברת יזמות התחדשות עירונית) ויועצים עצמאיים (רינה, 36, יועצת בטיחות)
• תכונות עיקריות: לוחות ניהול משימות לפי פרויקט, הקצאת משימות לצוות יועצים, ניהול רב-פרויקטי, תזכורות ודיווחים, אינטגרציה עם תשלומים
• דרישות טכניות: מערכת Web-based, Frontend React/Flutter, Backend Node.js, Database PostgreSQL, Authentication JWT/Auth0, אבטחה HTTPS ו-RBAC
• תשתית: Docker containers, Kubernetes, Cloud providers (AWS/GCP/Azure), CI/CD via GitHub Actions
• אלטרנטיבה: Full Firebase Stack עם Firebase Auth, Firestore, Cloud Functions
• UI/UX: Responsive design, Dark mode, רב-לשוני (עברית/אנגלית), מעקב שגיאות via Sentry'
WHERE file_name LIKE '%מסמך אפיון לקבלת הצעת מחיר%' 
AND project_id = '00c93365-08b7-4248-bae8-3629004227a0';