import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsAndConditionsProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
}

export const TermsAndConditions = ({ accepted, onAcceptChange }: TermsAndConditionsProps) => {
  return (
    <div className="space-y-4" dir="rtl">
      <ScrollArea className="h-64 border rounded-md p-4 bg-muted/30 text-right" dir="rtl">
        <div className="space-y-3 text-sm text-right" dir="rtl">
          <h3 className="font-bold text-lg text-primary">תנאי שימוש - מערכת ניהוליסט</h3>
          
          <p className="text-muted-foreground">
            ברוכים הבאים לפלטפורמת ניהוליסט. השימוש במערכת מהווה הסכמה מלאה לתנאי שימוש אלה.
          </p>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">1. כללי</h4>
            <p className="text-muted-foreground">
              תנאי שימוש אלה מסדירים את הגישה והשימוש בפלטפורמת ניהוליסט ("המערכת"). 
              השימוש במערכת מהווה הסכמה מלאה לתנאים אלה.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">2. הגדרות</h4>
            <p className="text-muted-foreground">
              <strong>"יזם"</strong> - משתמש המחפש יועצים לפרויקט בניה<br/>
              <strong>"יועץ"</strong> - איש מקצוע המספק שירותי ייעוץ לפרויקטי בניה<br/>
              <strong>"פרויקט"</strong> - פרויקט בניה המנוהל במערכת<br/>
              <strong>"RFP"</strong> - בקשה להצעת מחיר
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">3. רישום והרשמה</h4>
            <p className="text-muted-foreground">
              • המשתמש מתחייב למסור פרטים נכונים ומדויקים<br/>
              • המשתמש אחראי לשמירה על סודיות פרטי ההתחברות<br/>
              • אסור להעביר חשבון לאדם אחר
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">4. שימוש במערכת</h4>
            <p className="text-muted-foreground">
              • המערכת מיועדת לניהול פרויקטי בניה ובחירת יועצים<br/>
              • אסור להשתמש במערכת למטרות בלתי חוקיות<br/>
              • אסור להעלות תוכן פוגעני או לא הולם
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">5. פרטיות ואבטחת מידע</h4>
            <p className="text-muted-foreground">
              • המערכת מתחייבת לשמור על פרטיות המשתמשים<br/>
              • המידע ישמש למטרת ניהול פרויקטים בלבד<br/>
              • ראו את מדיניות הפרטיות המלאה
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">6. אחריות</h4>
            <p className="text-muted-foreground">
              • המערכת אינה אחראית לאיכות השירותים של היועצים<br/>
              • המערכת משמשת כפלטפורמה לחיבור בלבד<br/>
              • כל התקשרות היא בין היזם ליועץ באופן ישיר
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">7. קניין רוחני</h4>
            <p className="text-muted-foreground">
              • כל התכנים במערכת הינם קניינה של ניהוליסט<br/>
              • אסור להעתיק או להפיץ תכנים ללא אישור
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">8. שינויים לתנאי השימוש</h4>
            <p className="text-muted-foreground">
              • ניהוליסט שומרת לעצמה את הזכות לעדכן תנאים אלה<br/>
              • שימוש מתמשך מהווה הסכמה לתנאים המעודכנים
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">9. סיום השימוש</h4>
            <p className="text-muted-foreground">
              • המשתמש רשאי לסגור את חשבונו בכל עת<br/>
              • ניהוליסט שומרת לעצמה את הזכות לחסום משתמשים
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">10. יצירת קשר</h4>
            <p className="text-muted-foreground">
              לשאלות ובירורים: support@nihulist.co.il
            </p>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              תאריך עדכון אחרון: נובמבר 2025<br/>
              גרסה: 1.0
            </p>
          </div>
        </div>
      </ScrollArea>
      
      <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-md border" dir="rtl">
        <Checkbox 
          id="tos" 
          checked={accepted}
          onCheckedChange={(checked) => onAcceptChange(checked === true)}
          className="mt-1"
        />
        <Label 
          htmlFor="tos" 
          className="text-sm cursor-pointer leading-relaxed font-medium"
        >
          אני מאשר/ת את תנאי השימוש של ניהוליסט ומתחייב/ת לפעול על פיהם
        </Label>
      </div>
    </div>
  );
};
