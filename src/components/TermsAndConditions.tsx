import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RefObject } from "react";

interface TermsAndConditionsProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
  showError?: boolean;
  checkboxRef?: RefObject<HTMLButtonElement>;
}

export const TermsAndConditions = ({ 
  accepted, 
  onAcceptChange, 
  showError = false,
  checkboxRef 
}: TermsAndConditionsProps) => {
  return (
    <div className="space-y-4" dir="rtl">
      <ScrollArea className="h-96 border rounded-md p-4 bg-muted/30 text-right" dir="rtl">
        <div className="space-y-4 text-sm text-right pr-2" dir="rtl">
          <h3 className="font-bold text-lg text-primary">פלטפורמת בילדינג - תנאי שימוש ליועצים וספקי שירותים</h3>
          <p className="text-xs text-muted-foreground">עדכון אחרון: 18.1.26</p>

          {/* Section 1: Definitions */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">1. הגדרות</h4>
            <p className="text-muted-foreground">
              <strong>"החברה" או "הפלטפורמה"</strong> - חברת בי. די פינטק בע"מ והפלטפורמה האינטרנטית המופעלת על ידה, כאתר וכאפליקציה לטלפונים חכמים.
            </p>
            <p className="text-muted-foreground">
              <strong>"יועץ" או "נותן השירותים"</strong> - משתמש המציע שירותים מקצועיים באמצעות הפלטפורמה, לרבות אך לא רק: מהנדסים, אדריכלים, עורכי דין, רואי חשבון, קבלנים, יועצי נדל"ן ונותני שירותים מקצועיים אחרים.
            </p>
            <p className="text-muted-foreground">
              <strong>"היזם" או "הלקוח"</strong> - משתמש המחפש שירותים מקצועיים בתחום הנדל"ן באמצעות הפלטפורמה ומבקש הצעות מחיר מיועצים.
            </p>
            <p className="text-muted-foreground">
              <strong>"שירותי ייעוץ" או "השירותים המקצועיים"</strong> - השירותים המקצועיים המוצעים על ידי היועצים ליזמים, כמפורט בפרופיל היועץ ובהצעת המחיר.
            </p>
            <p className="text-muted-foreground">
              <strong>"שירותי החברה"</strong> - השירות המסופק על ידי החברה באמצעות הפלטפורמה, דהיינו: פלטפורמה לחיבור בין יזמים ליועצים.
            </p>
            <p className="text-muted-foreground">
              <strong>"משתמש"</strong> - כל אדם או תאגיד (באמצעות גורם מוסמך) העושה שימוש בפלטפורמה, על ידי גישה לאתר האינטרנט של החברה והאפליקציה לטלפונים חכמים, בין אם יועץ ובין אם יזם.
            </p>
          </div>

          {/* Section 2: General */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">2. כללי</h4>
            <p className="text-muted-foreground">
              המבוא למסמך זה ונספחיו מהווים חלק בלתי נפרד ממנו. כותרות הסעיפים הוכנסו לשם הנוחות בלבד ואין להם, ולא יינתן להם, כל משקל בפירושו. ההסכם נכתב בלשון זכר מטעמי נוחות בלבד, והוא מכוון לשני המינים כאחד.
            </p>
            <p className="text-muted-foreground">
              תנאי שימוש אלה חלים על יועצים המשתמשים בפלטפורמה על מנת לספק שירותים מקצועיים ליזמים. תנאי שימוש אלה באים להסדיר את השימוש שלך כמשתמש בפלטפורמה ובשירותים. השירותים שייכים לחברה ומופעלים על ידה. השירותים מוצעים בכפוף להסכמתך הבלתי מסויגת לכל התנאים המפורטים להלן ולכל כללים, מדיניות או נהלים אחרים אשר יפורסמו, מעת לעת, על ידי החברה, בפלטפורמה או בכל מקום אחר.
            </p>
          </div>

          {/* Section 3: About BillDing */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">3. אודות BillDing והפלטפורמה</h4>
            <p className="text-muted-foreground">
              BillDing היא פלטפורמה דיגיטלית המשמשת לחיבור בין יזמי נדל"ן ובין נותני שירותים מקצועיים בתחום הנדל"ן והבנייה.
            </p>
            <p className="text-muted-foreground">BillDing משמשת כפלטפורמת חיבור בלבד, וככזו:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>היא מאפשרת פרסום והצגת יועצים ושירותיהם המקצועיים.</li>
              <li>היא מאפשרת ליזמים לשלוח דרישות ובקשות להצעות מחיר.</li>
              <li>היא מאפשרת ליועצים להשיב להצעות מחיר ולנהל תקשורת עם יזמים.</li>
              <li>היא מאפשרת עריכת חוזים בין הצדדים.</li>
            </ul>
            <p className="text-muted-foreground font-medium mt-2">למען הסר ספק, מובהר ומודגש בזאת, כי החברה:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>אינה צד לחוזה בין היועץ ליזם.</li>
              <li>אינה אחראית לאיכות השירותים המסופקים על ידי היועץ.</li>
              <li>אינה אחראית לעצם אספקת השירותים על ידי היועץ.</li>
              <li>אינה אחראית לתשלום בין היזם ליועץ.</li>
              <li>אינה אחראית לכל טענה, מחלוקת, תביעה או נזק הנובעים מהיחסים בין היועץ ליזם.</li>
            </ul>
          </div>

          {/* Section 4: No Commitment */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">4. אין התחייבות מצד החברה</h4>
            <p className="text-muted-foreground">החברה אינה מתחייבת ל:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>כמות פניות או בקשות להצעות מחיר מצד יזמים.</li>
              <li>היקף עבודה או פרויקטים שיוצעו ליועץ.</li>
              <li>סגירת עסקאות בפועל בין יועצים ליזמים.</li>
              <li>זמינות רציפה של הפלטפורמה ללא תקלות.</li>
              <li>איכות, רצינות או יכולת תשלום של היזמים.</li>
            </ul>
          </div>

          {/* Section 5: Proposal Ranking */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">5. דירוג הצעות</h4>
            <p className="text-muted-foreground">
              כחלק משירותיה, הפלטפורמה מדרגת את ההצעות והיועצים לפי מספר שיקולים פנימיים המוגדרים על ידי הפלטפורמה ושמורים במערכת. דירוג זה עשוי להשתנות מעת לעת לפי צרכים עסקיים או פרמטרים אחרים שהפלטפורמה תמצא לנכון.
            </p>
            <p className="text-muted-foreground">
              נותן השירותים מסכים ומתחייב כי לא יהיו לו טענות או דרישות כלשהן כלפי הפלטפורמה בנוגע לאופן הדירוג, תוצאות הדירוג או כל שימוש אחר שנעשה במידע זה. יובהר, כי דירוג זה אינו מהווה לקיחת אחריות על טיב השירותים בפועל, והאחריות המלאה היא של נותן השירותים.
            </p>
          </div>

          {/* Section 6: Project Management Tools */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">6. כלי ניהול פרויקטים ומעקב</h4>
            <p className="text-muted-foreground">
              הפלטפורמה מאפשרת ליועצים וליזמים לנהל משימות, אבני דרך ולוחות זמנים של פרויקטים שהתקשרו עליהם דרך הפלטפורמה. במסגרת כלי זה, הפלטפורמה מאפשרת למשתמש מעקב אחר התקדמות פרויקטים, סטטוס משימות, והתראות אוטומטיות.
            </p>
            <p className="text-muted-foreground">
              למען הסר ספק, כלי הניהול והמעקב מסופקים כמות שהם (AS IS) ומהווים שירות נלווה בלבד. השימוש בהם אינו חובה, ואינו מחליף את ניהול הפרויקט המקצועי של היועץ.
            </p>
            <p className="text-muted-foreground">יובהר, כי החברה אינה אחראית:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>לשלמות או דיוק המידע שמוזן על ידי המשתמש למערכת ניהול המשימות.</li>
              <li>לכל נזק הנובע מאי עמידה של היועץ ו/או של היזם בלוחות זמנים או משימות המתועדים בפלטפורמה.</li>
              <li>לאיבוד מידע או נתונים ממערכת ניהול המשימות.</li>
              <li>לכל הסתמכות של צדדים על המידע במערכת ניהול המשימות, כולו או חלקו.</li>
            </ul>
          </div>

          {/* Section 7: Billing Tools */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">7. כלי בקרה תקציבית והגשת חשבונות</h4>
            <p className="text-muted-foreground">
              הפלטפורמה מאפשרת ליועצים להגיש ליזמים חשבונות ודרישות תשלום, כחלק מניהול פרויקט. ככל שיעשה היועץ שימוש בתכונה זו, יובהר, כי החברה אינה אחראית:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>לדיוק ולנכונות הסכומים, הפירוט ו/או המידע בכל חשבון ו/או דרישת תשלום שיוגשו באמצעות הפלטפורמה.</li>
              <li>להתאמה בין החשבון ו/או דרישת התשלום ובין ההסכם שנערך עם היזם, לוחות הזמנים ואבני הדרך שהוסכמו.</li>
              <li>לצירוף כל מסמך חסר, לרבות כל קבלה, אישור או נספח הנדרשים על פי הדין ו/או על פי ההסכם בין הצדדים.</li>
              <li>להנפקת חשבונית מס כדין ולפעולה בהתאם לדרישות המיסוי והחשבונאות החלות על היועץ ו/או על היזם.</li>
            </ul>
            <p className="text-muted-foreground font-medium mt-2">למען הסר ספק, יובהר ויודגש, כי:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>הפלטפורמה הנה כלי טכני להעברת מידע בלבד, ואינה מהווה תחליף להנפקת חשבונית מס או כל מסמך משפטי מחייב אחר.</li>
              <li>הגשת חשבון באמצעות הפלטפורמה אינה מהווה אישור ו/או אימות ו/או הסכמה של החברה לתוכן החשבון, לסכומים או לזכאות לתשלום.</li>
              <li>חשבונות המופקים על ידי הפלטפורמה אינם מהווים מסמכים חשבונאיים על פי דין.</li>
              <li>החברה אינה צד להסכם בין היועץ ליזם ואינה אחראית לתשלום.</li>
              <li>החברה אינה ולא תהיה מעורבת בכל מחלוקת בין הצדדים בנוגע לחשבונות, לתשלומים, לאיכות השירותים או לכל היבט אחר של היחסים בין היועץ ליזם.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              היועץ מתחייב להגיש את כל החשבונות ודרישות התשלום באמצעות מערכת הגשת החשבונות של הפלטפורמה, וזאת מבלי שיהיה בכך כדי להטיל על החברה אחריות לדיוק, נכונות או התאמת החשבונות המוגשים, או לכל נזק שייגרם כתוצאה מהגשת חשבונות שגויים או חסרים.
            </p>
          </div>

          {/* Section 8: Agreement to Terms */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">8. הסכמה לתנאים</h4>
            <p className="text-muted-foreground">
              תנאי שימוש אלה באים להסדיר את השימוש שלך כיועץ בפלטפורמה. בשימושך בפלטפורמה, הנך מצהיר כי הנך בן 18 ומעלה, וכי יש לך את הזכות, הרישיונות וההיתרים הנדרשים לספק את השירותים המקצועיים שאתה מציע באמצעות הפלטפורמה.
            </p>
            <p className="text-muted-foreground">
              ככל שהיועץ/נותן השירותים שבשמו אתה פועל הנו תאגיד, הנך מצהיר כי אתה המוסמך מטעם התאגיד להתחייב בשמו. מובהר כי החברה מסתמכת על הצהרתך כאמור, וכי יזמים עשויים להסתמך עליה.
            </p>
            <p className="text-muted-foreground">
              בשימושך או בגישתך לכל חלק בפלטפורמה, הנך מסכים לכל התנאים המפורטים במסמך זה. אם אינך מסכים לתנאים, אל תעשה שימוש בשירותים.
            </p>
          </div>

          {/* Section 9: No Employment Relationship */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">9. אי-קיום יחסי עבודה / שותפות</h4>
            <p className="text-muted-foreground">
              מובהר ומודגש בזאת, כי היועץ הנו קבלן עצמאי לכל דבר ועניין, וכי השימוש בפלטפורמה אינו יוצר:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>כל יחסי עובד–מעביד בין היועץ לבין החברה.</li>
              <li>כל יחסי שותפות בין היועץ לבין החברה.</li>
              <li>כל יחסי שליחות בין היועץ לבין החברה.</li>
              <li>כל יחסי מיזם משותף בין היועץ לבין החברה.</li>
            </ul>
            <p className="text-muted-foreground mt-2">היועץ אחראי באופן בלעדי ומלא על:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>תשלום מלוא המיסים, לרבות מס הכנסה, מע"מ (ככל שחל) וכל מס אחר.</li>
              <li>תשלומי ביטוח לאומי ו/או כל תשלום סוציאלי אחר הנדרש על פי דין.</li>
              <li>עריכת ביטוח אחריות מקצועית, ביטוח צד ג' וכל ביטוח אחר הנדרש על פי דין.</li>
              <li>החזקה בכל רישיון, היתר, הסמכה או אישור הנדרשים על פי דין לצורך מתן השירותים המקצועיים.</li>
              <li>איכות, מקצועיות ועמידה בלוחות זמנים של השירותים המקצועיים המסופקים על ידו.</li>
            </ul>
          </div>

          {/* Section 10: Advisor-Entrepreneur Agreement */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">10. ההתקשרות בין היועץ לבין היזם</h4>
            <p className="text-muted-foreground">
              ההסכם לשירותים ייכרת ישירות בין היועץ לבין היזם, וללא מעורבות משפטית של החברה ו/או הפלטפורמה. זאת, מבלי לגרוע מכלליות האמור, לרבות ההסכמות לגבי:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>מהות השירותים המקצועיים, תוכנם, היקפם ולוחות הזמנים לביצועם.</li>
              <li>התמורה עבור השירותים המקצועיים.</li>
              <li>מועדי תשלום, אופן התשלום, תנאי תשלום ואבני דרך.</li>
              <li>היקף האחריות המקצועית של היועץ, תקופת האחריות וסעדים במקרה של ליקויים.</li>
              <li>כל תנאי נוסף המוסכם בין הצדדים.</li>
            </ul>
            <p className="text-muted-foreground mt-2 font-medium">מובהר ומודגש בזאת, כי החברה אינה צד להסכם בין היועץ ליזם, ואינה אחראית:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>לאי-תשלום, חלקי או מלא, תשלום באיחור או כל מחלוקת תשלום בין היזם ליועץ.</li>
              <li>לכל ליקוי, פגם, אי דיוק או אי התאמה בשירותים המקצועיים שסופקו על ידי היועץ.</li>
              <li>לאי אספקת השירותים על ידי היועץ, אספקה חלקית, איחור באספקה או ביטול העסקה.</li>
              <li>לאיכות, מקצועיות, רמה או כל היבט אחר של השירותים המקצועיים.</li>
              <li>לכל נזק, ישיר או עקיף, שייגרם ליועץ, ליזם או לצד שלישי כלשהו.</li>
              <li>להתנהגות, מעשים או מחדלים של היזם או של היועץ.</li>
              <li>להתבטאויות פוגעניות בין הצדדים.</li>
              <li>לכל מחלוקת, סכסוך או תביעה בין היועץ ליזם.</li>
            </ul>
          </div>

          {/* Section 11: Indemnification */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">11. שיפוי החברה</h4>
            <p className="text-muted-foreground">
              ככל שיועלו נגד החברה טענות או אם יוגשו כנגד החברה דרישות או תביעות בגלל מעשי או מחדלי היועץ בקשר עם השירותים המקצועיים או ההתקשרות עם היזם, היועץ ישפה את החברה באופן מלא ומיידי.
            </p>
          </div>

          {/* Section 12: Advisor Obligations */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">12. שימוש בפלטפורמה – התחייבויות היועץ</h4>
            <p className="text-muted-foreground">היועץ מתחייב:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>למסור פרטים נכונים, מלאים, מדויקים ומעודכנים, לרבות: שם אמיתי, פרטי קשר, תחום התמחות ומקצוע, ניסיון מקצועי, השכלה והסמכות, רישיונות והיתרים רלוונטיים.</li>
              <li>לעדכן באופן שוטף את הפרופיל המוצג בפלטפורמה ולוודא שכל המידע המוצג הנו נכון, מדויק ועדכני.</li>
              <li>לפעול בכל עת במקצועיות, ביושר ובהתאם לכללי האתיקה המקצועיים החלים על היועץ.</li>
              <li>להשיב לפניות מיזמים באופן מהיר, מקצועי ומנומס, ולספק הצעות מחיר מפורטות, ברורות והוגנות.</li>
              <li>לעמוד בכל התחייבות שנטל על עצמו כלפי יזם, לרבות לוחות זמנים, איכות שירות ותנאי ההסכם.</li>
              <li>לשמור בסודיות מוחלטת על כל מידע שיגיע אל היועץ מיזמים, לרבות פרטי פרויקטים, מסמכים ומידע עסקי.</li>
              <li>לעדכן את מערכת ניהול המשימות באופן שוטף ומדויק, ככל שהוא עושה בה שימוש.</li>
              <li>להגיש חשבונות רק על עבודה שבוצעה בפועל ובהתאם להסכם עם היזם.</li>
              <li>לא לעשות בפלטפורמה כל שימוש מטעה, מניפולטיבי או למטרה בלתי הוגנת.</li>
              <li>לשמור עותקים עצמאיים של כל המסמכים, ההסכמים והחשבונות, ולא להסתמך על הפלטפורמה לצורך גיבוי ושמירת מידע.</li>
            </ul>
          </div>

          {/* Section 13: Prohibited Uses */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">13. שימושים אסורים</h4>
            <p className="text-muted-foreground">היועץ מתחייב להימנע מהפעולות הבאות בקשר עם הפלטפורמה:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>שימוש בפלטפורמה לכל מטרה האסורה בדין, לרבות מטרות פליליות, תרמית, הונאה או כל פעילות בלתי חוקית אחרת.</li>
              <li>מסירת מידע כוזב, מטעה או לא מדויק, לרבות לגבי כישורים, ניסיון, רישיונות, פרויקטים קודמים או כל היבט אחר.</li>
              <li>כל התנהגות אלימה, בוטה, מאיימת, פוגענית, מעליבה או פוגעת.</li>
              <li>העלאת תוכן המפר זכויות יוצרים, סימני מסחר, פטנטים או כל זכות קניין רוחני של אחר.</li>
              <li>פרסום תוכן העשוי להוות לשון הרע, דיבה, השמצה או פגיעה במוניטין של אחר.</li>
              <li>הפרת סודיות של לקוחות, יזמים או צדדים שלישיים.</li>
              <li>שימוש בפלטפורמה באמצעות תוכנות איסוף מידע כגון Bots, Crawlers, Scrapers וכדומה.</li>
              <li>מניפולציה על כתובת ה-URL של דפים פנימיים (URL Hacking) או כל ניסיון אחר לפגוע באבטחת הפלטפורמה.</li>
              <li>ניסיון ליצור קשר ישיר עם יזמים מחוץ לפלטפורמה במטרה לעקוף את העמלות או התנאים של הפלטפורמה.</li>
              <li>ביצוע פעולה בעיצוב הפלטפורמה, קוד המקור, אלמנטים או תכנים המופיעים בפלטפורמה, אשר הזכות לבצעה נתונה בלעדית לבעל זכות היוצרים.</li>
              <li>כל פעולה העלולה לפגוע בפעילות התקינה של הפלטפורמה.</li>
              <li>הגשת חשבונות כוזבים, מטעים או מנופחים.</li>
              <li>הגשת חשבונות מחוץ לפלטפורמה ליזם אשר הקשר עמו נוצר באמצעות הפלטפורמה.</li>
            </ul>
            
            <p className="text-muted-foreground mt-3 font-medium">פיצוי מוסכם בגין עקיפת הפלטפורמה:</p>
            <p className="text-muted-foreground">
              הפרת האיסור על הגשת חשבונות מחוץ לפלטפורמה תחייב את היועץ בתשלום פיצוי מוסכם וקבוע מראש לפי סך ההזמנות המצטבר בפועל:
            </p>
            <div className="bg-muted/50 p-3 rounded-md mt-2 space-y-1 text-muted-foreground">
              <p>• עד 5,000 ש״ח - 15%</p>
              <p>• מעל 5,000 ש״ח ועד 10,000 ש״ח - 12%</p>
              <p>• מעל 10,000 ש״ח ועד 20,000 ש״ח - 10%</p>
              <p>• מעל 20,000 ש״ח ועד 30,000 ש״ח - 9%</p>
              <p>• מעל 30,000 ש״ח ועד 40,000 ש״ח - 8%</p>
              <p>• מעל 40,000 ש״ח ועד 50,000 ש״ח - 7%</p>
              <p>• מעל 50,000 ש״ח - 6%</p>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              הפיצוי ייגבה ללא צורך בהוכחת נזק, ייחשב חוב כספי מיידי כלפי החברה, וייגבה על בסיס נתוני המערכת בלבד. רישומי המערכת יהוו ראיה מכרעת לצורך חישוב הפיצוי.
            </p>
          </div>

          {/* Section 14: Account Security */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">14. שמירה על גישה לחשבון</h4>
            <p className="text-muted-foreground">
              היועץ מתחייב לשמור על סיסמתו וגישתו לחשבון בסודיות מוחלטת, ולא להעביר פרטים אלה לאף גורם אחר. היועץ יהיה אחראי לכל פעולה שתבוצע באמצעות חשבונו.
            </p>
          </div>

          {/* Section 15: User Account */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">15. חשבון משתמש</h4>
            <p className="text-muted-foreground">
              החברה שומרת לעצמה את הזכות לקבוע כי גישה לשירותים מסוימים או לכל השירותים תתאפשר רק ליועץ אשר נרשם לפלטפורמה.
            </p>
            <p className="text-muted-foreground mt-2">הוראות לגבי חשבון משתמש:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>אסור ליצור חשבון משתמש המכיל פרטים אשר אינם פרטיו האמיתיים והמלאים של היועץ.</li>
              <li>אסור ליצור חשבון עבור אדם אשר אינו נוכח בעת ההרשמה, או אשר אינו מאשר את תנאי הסכם זה.</li>
              <li>אסור ליצור חשבון עבור תאגיד אשר המשתמש אינו מוסמך להתחייב בשמו.</li>
              <li>אסור ליצור יותר מחשבון אחד, אלא אם ניתן אישור מפורש מהחברה מראש ובכתב.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              מובהר בזאת, כי על אף שהחברה מבצעת פעולות במטרה לשמור על אבטחת המידע של החשבון, החברה אינה יכולה להבטיח כי לא תתרחש דליפת מידע.
            </p>
          </div>

          {/* Section 16: Identity Verification */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">16. אימות זהות ומסמכים</h4>
            <p className="text-muted-foreground">
              החברה תהיה רשאית, בכל עת ועל פי שיקול דעתה הבלעדי, לדרוש מהיועץ לספק מסמכים ואישורים לצורך אימות זהותו, כישוריו המקצועיים, רישיונותיו או כל מידע אחר. אי המצאת המסמכים תוך פרק זמן סביר עלולה להוביל להשעיית החשבון או לסגירתו.
            </p>
          </div>

          {/* Section 17: Company Compensation */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">17. תמורה לחברה (ככל שתחול)</h4>
            <p className="text-muted-foreground">
              כרגע, השימוש בפלטפורמה הנו ללא תשלום עבור יועצים. עם זאת, החברה שומרת לעצמה את הזכות לשנות את מדיניות התשלום בעתיד, ולגבות עמלות, דמי מנוי או כל תשלום אחר מיועצים.
            </p>
            <p className="text-muted-foreground mt-2">
              החברה רשאית לשנות את מדיניות התשלום בכל עת, ובלבד שתינתן הודעה מראש ליועצים באמצעות הפלטפורמה או בדוא"ל, לפחות 30 יום לפני כניסת השינוי לתוקף.
            </p>
            <p className="text-muted-foreground mt-2 font-medium">מודלים אפשריים לעתיד:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>עמלה על עסקה</li>
              <li>דמי מנוי חודשי או שנתי</li>
              <li>דמי רישום חד-פעמי</li>
              <li>תשלום לפי שירות (קידום פרופיל, הצגה בולטת וכדומה)</li>
            </ul>
            
            <p className="text-muted-foreground mt-3 font-medium">מדרגות עמלה אפשריות (באחוזים מסכום החשבון לפני מע״מ):</p>
            <div className="bg-muted/50 p-3 rounded-md mt-2 space-y-1 text-muted-foreground">
              <p>• עד 5,000 ש״ח - 5%</p>
              <p>• מעל 5,000 ש״ח ועד 10,000 ש״ח - 4.2%</p>
              <p>• מעל 10,000 ש״ח ועד 20,000 ש״ח - 3.8%</p>
              <p>• מעל 20,000 ש״ח ועד 30,000 ש״ח - 3.5%</p>
              <p>• מעל 30,000 ש״ח ועד 40,000 ש״ח - 3.2%</p>
              <p>• מעל 40,000 ש״ח ועד 50,000 ש״ח - 3.0%</p>
              <p>• מעל 50,000 ש״ח - 2.5%</p>
            </div>
          </div>

          {/* Section 18: Liability Limitations */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">18. הגבלת אחריות של החברה</h4>
            <p className="text-muted-foreground">
              השירותים מסופקים על בסיס "AS IS" ועל בסיס "AS AVAILABLE" (כמות שהם וכפי שהם זמינים). החברה מצהירה באופן מפורש, כי אינה נוטלת אחריות מכל סוג שהוא, מפורש או נרמז.
            </p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>החברה אינה מתחייבת כי השירותים יתאימו לדרישות המשתמש או לציפיותיו.</li>
              <li>החברה אינה מתחייבת כי השירותים יהיו רציפים, בטוחים, נטולי שגיאות או זמינים בכל רגע נתון.</li>
              <li>החברה אינה מתחייבת לשלמות הנתונים, ועל המשתמש האחריות להחזיק גיבוי של כל מסמך ו/או נתון.</li>
              <li>החברה לא תהיה אחראית לכל נזק עקיף, אקראי, מיוחד, עונשי או תוצאתי.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              ככל שהחוק הישראלי אינו מאפשר הסתלקות מאחריות כאמור, תוגבל אחריות החברה לסכום המירבי שישולם על ידי המשתמש לחברה ב-12 החודשים שקדמו לאירוע שגרם לנזק, או 1,000 ₪ (לא כולל מע"מ), לפי הנמוך ביניהם.
            </p>
          </div>

          {/* Section 19: Service Availability */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">19. זמינות השירות ותחזוקה</h4>
            <p className="text-muted-foreground">
              החברה רשאית לבצע תחזוקה, עדכונים ושינויים בפלטפורמה בכל עת. החברה תהיה רשאית להשעות או להפסיק את השירות זמנית או לצמיתות, ללא הודעה מוקדמת.
            </p>
          </div>

          {/* Section 20: Intellectual Property */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">20. קניין רוחני</h4>
            <p className="text-muted-foreground">
              כל זכויות הקניין הרוחני בפלטפורמה, לרבות עיצוב, תוכן, קוד מקור וסימני מסחר, שייכות לחברה בלבד. החברה מעניקה ליועץ רישיון מוגבל, אישי, בלתי בלעדי ובלתי ניתן להעברה לשימוש בפלטפורמה בלבד.
            </p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>אסור ליועץ להעתיק, לשכפל, להפיץ או למכור את הפלטפורמה או כל חלק ממנה.</li>
              <li>אסור לבצע הנדסה הפוכה או לנסות לחלץ את קוד המקור של הפלטפורמה.</li>
              <li>העלאת תוכן לפלטפורמה מהווה מתן רישיון לא בלעדי, ללא תמלוגים, לחברה לשימוש, הצגה והפצה של התוכן.</li>
              <li>היועץ מצהיר שהוא בעל כל הזכויות בתוכן שהוא מעלה ושהתוכן אינו מפר זכויות צדדים שלישיים.</li>
            </ul>
          </div>

          {/* Section 21: Privacy */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">21. פרטיות ואיסוף נתונים</h4>
            <p className="text-muted-foreground">
              החברה שומרת לעצמה את הזכות לאסוף, לשמור ולעבד נתונים הנוצרים במהלך שימוש היועץ בפלטפורמה, לצורך תפעול הפלטפורמה, שיפור האלגוריתמים שלה, התאמות טכנולוגיות ובקרה תפעולית.
            </p>
            <p className="text-muted-foreground mt-2">
              הנתונים שייאספו עשויים לכלול מידע עסקי, תפעולי ופיננסי, וכן נתונים מזהים אישית, לרבות שם, פרטי התקשרות, פרטי התקשרויות, חשבונות, היקף פעילות, מועדי שימוש, ונתונים נוספים הנדרשים לצורך זיהוי היועץ, ניהול הפעילות במערכת, גבייה, אכיפה ועמידה בדרישות דין.
            </p>
            <p className="text-muted-foreground mt-2">
              השימוש במערכת מהווה הסכמה מפורשת של היועץ לאיסוף, שמירה, עיבוד ושימוש בנתונים, לרבות נתונים מזהים אישית.
            </p>
          </div>

          {/* Section 22: Taxation */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">22. מיסוי וניכוי מס במקור</h4>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>היועץ אחראי באופן בלעדי לדיווח למס הכנסה על כל הכנסותיו מהשירותים המקצועיים.</li>
              <li>היועץ מתחייב להנפיק חשבונית מס או קבלה כדין לכל יזם בגין שירותיו.</li>
              <li>ככל שהיועץ הינו עוסק מורשה, עליו לגבות מע״מ מהיזם ולהעבירו לרשויות המס כדין.</li>
              <li>היזם יהיה רשאי, ככל שחלה עליו חובה על פי דין, לנכות מס במקור מהתשלומים המשולמים ליועץ.</li>
              <li>ככל שהחברה תידרש על ידי רשויות המס למסור מידע על יועץ או על הכנסותיו, החברה תהיה רשאית למסור מידע כאמור.</li>
              <li>היועץ מתחייב לשפות את החברה בגין כל דרישה, קנס או תשלום שיוטלו על החברה בשל אי עמידת היועץ בחובותיו המיסויים.</li>
            </ul>
          </div>

          {/* Section 23: Account Termination */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">23. סיום השימוש והשעיית חשבון</h4>
            <p className="text-muted-foreground">
              היועץ רשאי להפסיק את השימוש בפלטפורמה ולסגור את חשבונו בכל עת.
            </p>
            <p className="text-muted-foreground mt-2">החברה רשאית להשעות או לסגור את חשבון היועץ ללא הודעה מוקדמת, במקרים הבאים:</p>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>הפרה של תנאי שימוש אלה.</li>
              <li>מסירת מידע כוזב או מטעה.</li>
              <li>התנהגות פוגענית או מזיקה.</li>
              <li>קבלת תלונות חוזרות מיזמים.</li>
              <li>אי פעילות מעל 12 חודשים.</li>
              <li>הגשת חשבונות כוזבים או שימוש לרעה במערכת הגשת החשבונות.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              בעת סגירת חשבון, היועץ יאבד גישה לכל המידע והנתונים, והחברה לא תהיה חייבת לשמרם. היועץ יישאר אחראי לכל התחייבויותיו כלפי יזמים גם לאחר סגירת החשבון.
            </p>
          </div>

          {/* Section 24: Terms Modification */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">24. שינויים בתנאי השימוש</h4>
            <p className="text-muted-foreground">
              החברה רשאית לשנות את תנאי השימוש בכל עת. שינויים מהותיים יפורסמו בפלטפורמה או יישלחו בדואר אלקטרוני, 14 יום לפני כניסתם לתוקף.
            </p>
            <p className="text-muted-foreground mt-2">
              המשך השימוש בפלטפורמה לאחר השינוי מהווה הסכמה לתנאים המעודכנים. אם אינך מסכים לשינויים, עליך להפסיק את השימוש בפלטפורמה.
            </p>
          </div>

          {/* Section 25: Applicable Law */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">25. דין חל וסמכות שיפוט</h4>
            <p className="text-muted-foreground">
              על תנאי שימוש אלה יחול הדין הישראלי בלבד. הסמכות השיפוטית הייחודית והבלעדית תהיה לבתי המשפט המוסמכים במחוז תל אביב-יפו בלבד.
            </p>
          </div>

          {/* Section 26: General Provisions */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">26. הוראות כלליות</h4>
            <ul className="list-disc list-inside text-muted-foreground mr-4 space-y-1">
              <li>תנאי שימוש אלה מהווים את מלוא ההסכם בין הצדדים ומבטלים כל הסכם קודם.</li>
              <li>אם הוראה כלשהי תימצא בלתי תקפה או בלתי אכיפה, שאר ההוראות יישארו בתוקף.</li>
              <li>היועץ אינו רשאי להעביר את זכויותיו או חובותיו ללא הסכמת החברה בכתב.</li>
            </ul>
          </div>

          {/* Section 27: Contact */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">27. יצירת קשר</h4>
            <p className="text-muted-foreground">לשאלות או פניות ניתן ליצור קשר:</p>
            <p className="text-muted-foreground">
              <strong>חברת בי. די פינטק בע"מ</strong><br/>
              כתובת: הסדנאות 4, הרצליה<br/>
              דואר אלקטרוני: contact@billding.ai
            </p>
            <p className="text-muted-foreground mt-2">
              כל הודעה שתישלח ליועץ לכתובת הדואר האלקטרוני שמסר תיחשב כאילו התקבלה תוך 24 שעות.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              תאריך עדכון אחרון: 18.1.26<br/>
              גרסה: 3.0
            </p>
          </div>
        </div>
      </ScrollArea>
      
      <div 
        className={cn(
          "flex flex-col gap-3 p-4 rounded-md border transition-colors",
          showError 
            ? "bg-destructive/5 border-destructive/50" 
            : accepted 
              ? "bg-primary/5 border-primary/30"
              : "bg-muted/20 border-input"
        )} 
        dir="rtl"
      >
        <div className="flex items-start gap-3 flex-row-reverse justify-end">
          <Checkbox 
            ref={checkboxRef}
            id="tos" 
            checked={accepted}
            onCheckedChange={(checked) => onAcceptChange(checked === true)}
            className="mt-1"
            aria-describedby={showError ? "acknowledgment-error" : undefined}
            aria-invalid={showError}
          />
          <Label 
            htmlFor="tos" 
            className="text-sm cursor-pointer leading-relaxed font-medium"
          >
            אני מאשר/ת את תנאי השימוש של פלטפורמת בילדינג ומתחייב/ת לפעול על פיהם
          </Label>
        </div>
        
        {/* Inline Error Message */}
        {showError && (
          <div 
            id="acknowledgment-error" 
            role="alert" 
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>יש לאשר את האמור לעיל כדי להמשיך</span>
          </div>
        )}
      </div>
    </div>
  );
};
