import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  name: string | null;
  email: string;
}

export const UserHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user?.id)
        .single();

      setProfile({
        name: data?.name || null,
        email: user?.email || ''
      });
    } catch (error) {
      setProfile({
        name: null,
        email: user?.email || ''
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const displayName = profile?.name || profile?.email?.split('@')[0] || 'משתמש';

  if (!user || !profile) {
    return null;
  }

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(profile.name, profile.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 bg-background border-border shadow-lg z-50" 
        align="end" 
        sideOffset={8}
      >
        <div className="flex items-start gap-3 p-3 border-b border-border">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(profile.name, profile.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 text-right overflow-hidden">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        </div>
        
        <div className="p-1">
          <DropdownMenuItem 
            onClick={() => navigate('/profile')} 
            className="text-right cursor-pointer py-2.5 px-3 rounded-md"
          >
            <User className="ml-2 h-4 w-4 shrink-0" />
            <span>הפרופיל שלי</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => navigate('/profile?tab=settings')}
            className="text-right cursor-pointer py-2.5 px-3 rounded-md"
          >
            <Settings className="ml-2 h-4 w-4 shrink-0" />
            <span>הגדרות</span>
          </DropdownMenuItem>
        </div>
        
        <DropdownMenuSeparator />
        
        <div className="p-1">
          <DropdownMenuItem 
            onClick={handleSignOut} 
            className="text-right cursor-pointer py-2.5 px-3 rounded-md text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
          >
            <LogOut className="ml-2 h-4 w-4 shrink-0" />
            <span>התנתק</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};