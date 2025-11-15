import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getPrimaryRole } from '@/lib/roleNavigation';
import type { AppRole } from '@/lib/roleNavigation';

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  company_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  tos_accepted_at: string | null;
  tos_version: string | null;
  requires_password_change: boolean | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  created_by: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  primaryRole: null,
  loading: true,
  signOut: async () => {},
  isAdmin: false,
  hasRole: () => false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Fetch user profile and roles
  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchRoles = async (userId: string) => {
    setRolesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) throw error;
      setRoles(data?.map(r => r.role as AppRole) || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST - synchronous to avoid deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] Auth event:', event, 'session:', !!session, 'timestamp:', new Date().toISOString());
        
        // Log session expiry information
        if (session) {
          const expiresAt = new Date(session.expires_at! * 1000);
          console.log('[useAuth] Session expires at:', expiresAt.toISOString());
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Start loading immediately
          setProfileLoading(true);
          setRolesLoading(true);
          // Defer Supabase calls to avoid deadlock
          setTimeout(() => {
            Promise.all([
              fetchProfile(session.user!.id),
              fetchRoles(session.user!.id)
            ]).catch((err) => {
              console.error('[useAuth] Deferred auth fetch error:', err);
              setProfileLoading(false);
              setRolesLoading(false);
            });
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setProfileLoading(false);
          setRolesLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[useAuth] Initial session check:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setProfileLoading(true);
        setRolesLoading(true);
        Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id)
        ]).catch((err) => {
          console.error('[useAuth] Initial session fetch error:', err);
          setProfileLoading(false);
          setRolesLoading(false);
        });
      } else {
        setProfileLoading(false);
        setRolesLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set up session refresh interval to keep session alive
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[useAuth] Session refresh error:', error);
        return;
      }
      
      if (session) {
        console.log('[useAuth] Session refreshed successfully');
        setSession(session);
        setUser(session.user);
      } else {
        console.warn('[useAuth] No session found during refresh');
      }
    }, 50 * 60 * 1000); // 50 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setRoles([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loading = profileLoading || rolesLoading;
  const isAdmin = roles.includes('admin');
  const hasRole = (role: AppRole) => roles.includes(role);
  const primaryRole = getPrimaryRole(roles);

  const value = {
    user,
    session,
    profile,
    roles,
    primaryRole,
    loading,
    signOut,
    isAdmin,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};