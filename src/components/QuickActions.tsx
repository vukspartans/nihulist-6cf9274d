import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  FileText, 
  Users, 
  Settings, 
  Download,
  Upload,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'פרויקט חדש',
      description: 'צור פרויקט חדש',
      icon: Plus,
      onClick: () => navigate('/projects/new'),
      variant: 'tech' as const
    },
    {
      title: 'ניהול ספקים',
      description: 'צפה וערוך ספקים',
      icon: Users,
      onClick: () => {}, // TODO: Implement supplier management
      variant: 'outline' as const
    },
    {
      title: 'דוחות',
      description: 'צפה בדוחות ואנליטיקס',
      icon: FileText,
      onClick: () => {}, // TODO: Implement reports
      variant: 'outline' as const
    },
    {
      title: 'יצוא נתונים',
      description: 'הורד נתונים לאקסל',
      icon: Download,
      onClick: () => {}, // TODO: Implement export
      variant: 'outline' as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="w-5 h-5 ml-2" />
          פעולות מהירות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              className="h-auto p-4 justify-start"
              onClick={action.onClick}
            >
              <div className="flex items-center w-full">
                <action.icon className="w-5 h-5 ml-3 flex-shrink-0" />
                <div className="text-right flex-1">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs opacity-70">{action.description}</div>
                </div>
              </div>
            </Button>
          ))}
        </div>
        
        {/* Additional Quick Links */}
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">קישורים מהירים</h4>
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Calendar className="w-4 h-4 ml-2" />
              לוח זמנים כללי
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Upload className="w-4 h-4 ml-2" />
              העלאת קבצים
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Search className="w-4 h-4 ml-2" />
              חיפוש מתקדם
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};