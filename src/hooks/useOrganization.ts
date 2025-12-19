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
      // Create the company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: input.name,
          type: input.type || 'entrepreneur',
          registration_number: input.registration_number,
          country: input.country || 'Israel',
          location: input.location,
          founding_year: input.founding_year,
          phone: input.phone,
          email: input.email,
          website: input.website,
          description: input.description,
          employee_count: input.employee_count,
          activity_categories: input.activity_categories || [],
          primary_activity_category: input.primary_activity_category,
          activity_scope: input.activity_scope,
          activity_scope_tier: input.activity_scope_tier,
          activity_regions: input.activity_regions || [],
          linkedin_url: input.linkedin_url,
          onboarding_completed_at: input.onboarding_completed_at,
          onboarding_skipped_at: input.onboarding_skipped_at
        })
        .select()
        .single();

      if (companyError) {
        throw companyError;
      }

      // Link the organization to the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: companyData.id })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('[useOrganization] Error linking organization to profile:', profileError);
        // Don't throw - organization was created, just linking failed
      }

      setOrganization(companyData as Organization);
      return companyData as Organization;
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
