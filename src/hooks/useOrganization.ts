import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface Organization {
  id: string;
  name: string;
  type: string;
  registration_number: string | null;
  country: string | null;
  location: string | null;
  founding_year: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  employee_count: string | null;
  activity_categories: Json;
  primary_activity_category: string | null;
  activity_scope: string | null;
  activity_scope_tier: string | null;
  activity_regions: string[] | null;
  linkedin_url: string | null;
  onboarding_completed_at: string | null;
  onboarding_skipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInput {
  name: string;
  type?: string;
  registration_number?: string;
  country?: string;
  location?: string;
  founding_year?: number;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  employee_count?: string;
  activity_categories?: Json;
  primary_activity_category?: string;
  activity_scope?: string;
  activity_scope_tier?: string;
  activity_regions?: string[];
  linkedin_url?: string;
  onboarding_completed_at?: string;
  onboarding_skipped_at?: string;
}

export function useOrganization() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if profile has organization_id
      const organizationId = (profile as any).organization_id;
      
      if (!organizationId) {
        setOrganization(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setOrganization(data as Organization);
    } catch (err) {
      console.error('[useOrganization] Error fetching organization:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const createOrganization = async (input: OrganizationInput): Promise<Organization | null> => {
    if (!user) {
      toast({
        title: 'שגיאה',
        description: 'יש להתחבר כדי ליצור ארגון',
        variant: 'destructive'
      });
      return null;
    }

    try {
      // Use SECURITY DEFINER function to atomically create company and link to profile
      const { data, error } = await supabase.rpc('create_organization_for_user', {
        p_name: input.name,
        p_type: input.type || 'entrepreneur',
        p_registration_number: input.registration_number || null,
        p_country: input.country || 'Israel',
        p_location: input.location || null,
        p_founding_year: input.founding_year || null,
        p_phone: input.phone || null,
        p_email: input.email || null,
        p_website: input.website || null,
        p_description: input.description || null,
        p_employee_count: input.employee_count || null,
        p_activity_categories: input.activity_categories || [],
        p_primary_activity_category: input.primary_activity_category || null,
        p_activity_scope: input.activity_scope || null,
        p_activity_scope_tier: input.activity_scope_tier || null,
        p_activity_regions: input.activity_regions || [],
        p_linkedin_url: input.linkedin_url || null,
        p_onboarding_completed_at: input.onboarding_completed_at || null,
        p_onboarding_skipped_at: input.onboarding_skipped_at || null
      });

      if (error) {
        throw error;
      }

      const orgData = data as unknown as Organization;
      setOrganization(orgData);
      return orgData;
    } catch (err) {
      console.error('[useOrganization] Error creating organization:', err);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה ביצירת הארגון',
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateOrganization = async (updates: Partial<OrganizationInput>): Promise<boolean> => {
    if (!organization) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא ארגון לעדכון',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { data, error: updateError } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', organization.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setOrganization(data as Organization);
      return true;
    } catch (err) {
      console.error('[useOrganization] Error updating organization:', err);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בעדכון הארגון',
        variant: 'destructive'
      });
      return false;
    }
  };

  const completeOnboarding = async (): Promise<boolean> => {
    return updateOrganization({
      onboarding_completed_at: new Date().toISOString()
    });
  };

  const skipOnboarding = async (): Promise<boolean> => {
    return updateOrganization({
      onboarding_skipped_at: new Date().toISOString()
    });
  };

  const needsOnboarding = (): boolean => {
    if (!profile || (profile as any).role !== 'entrepreneur') {
      return false;
    }
    
    // Check localStorage fallback - user explicitly skipped
    if (typeof window !== 'undefined' && localStorage.getItem('onboarding_skipped') === 'true') {
      return false;
    }
    
    if (!organization) {
      return true;
    }

    return !organization.onboarding_completed_at && !organization.onboarding_skipped_at;
  };

  return {
    organization,
    loading,
    error,
    createOrganization,
    updateOrganization,
    completeOnboarding,
    skipOnboarding,
    needsOnboarding,
    refetch: fetchOrganization
  };
}
