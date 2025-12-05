import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface NotificationItem {
  id: string;
  projectName: string;
  advisorType?: string;
  createdAt: string;
}

interface NotificationsDropdownProps {
  notifications: NotificationItem[];
}

export const NotificationsDropdown = ({ notifications }: NotificationsDropdownProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  const handleNotificationClick = (inviteId: string) => {
    setOpen(false);
    navigate(`/invite/${inviteId}/details`);
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: he 
      });
    } catch {
      return '';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -left-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end" 
        dir="rtl"
      >
        <div className="p-3 border-b bg-muted/50">
          <h4 className="font-semibold text-sm">התראות</h4>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">אין התראות חדשות</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className="w-full p-3 text-right hover:bg-muted/50 transition-colors flex items-start gap-3"
                >
                  <div className="shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {notification.projectName}
                    </p>
                    {notification.advisorType && (
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.advisorType}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(notification.createdAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};
