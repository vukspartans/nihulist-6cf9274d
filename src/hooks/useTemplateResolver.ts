import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskTemplate } from './useTaskTemplatesAdmin';

interface ResolvedTemplate {
  templates: TaskTemplate[];
  source: 'municipality_project' | 'municipality_general' | 'project_general' | 'none';
  municipalityName?: string;
}

/**
 * Hook for resolving task templates based on hierarchy:
 * 1. Municipality + Project Type specific templates
 * 2. Municipality general templates (project_type is null)
 * 3. Project Type general templates (municipality_id is null)
 * 4. No templates found
 */
export function useTemplateResolver() {
  const resolveTemplate = useCallback(async (
    projectType: string,
    municipalityId?: string | null
  ): Promise<ResolvedTemplate> => {
    try {
      // Strategy 1: Municipality + Project Type specific
      if (municipalityId) {
        const { data: specificTemplates, error: specificError } = await supabase
          .from('task_templates')
          .select(`
            *,
            municipalities:municipality_id (id, name),
            licensing_phases:licensing_phase_id (id, name)
          `)
          .eq('municipality_id', municipalityId)
          .eq('project_type', projectType)
          .eq('is_active', true)
          .eq('is_default', true)
          .order('display_order', { ascending: true });

        if (!specificError && specificTemplates && specificTemplates.length > 0) {
          return {
            templates: specificTemplates as TaskTemplate[],
            source: 'municipality_project',
            municipalityName: specificTemplates[0]?.municipalities?.name
          };
        }

        // Strategy 2: Municipality general (no project_type filter)
        const { data: municipalityTemplates, error: municipalityError } = await supabase
          .from('task_templates')
          .select(`
            *,
            municipalities:municipality_id (id, name),
            licensing_phases:licensing_phase_id (id, name)
          `)
          .eq('municipality_id', municipalityId)
          .is('project_type', null)
          .eq('is_active', true)
          .eq('is_default', true)
          .order('display_order', { ascending: true });

        if (!municipalityError && municipalityTemplates && municipalityTemplates.length > 0) {
          return {
            templates: municipalityTemplates as TaskTemplate[],
            source: 'municipality_general',
            municipalityName: municipalityTemplates[0]?.municipalities?.name
          };
        }
      }

      // Strategy 3: Project Type general (no municipality)
      const { data: projectTemplates, error: projectError } = await supabase
        .from('task_templates')
        .select(`
          *,
          municipalities:municipality_id (id, name),
          licensing_phases:licensing_phase_id (id, name)
        `)
        .is('municipality_id', null)
        .eq('project_type', projectType)
        .eq('is_active', true)
        .eq('is_default', true)
        .order('display_order', { ascending: true });

      if (!projectError && projectTemplates && projectTemplates.length > 0) {
        return {
          templates: projectTemplates as TaskTemplate[],
          source: 'project_general'
        };
      }

      // No templates found
      return {
        templates: [],
        source: 'none'
      };
    } catch (error) {
      console.error('Error resolving templates:', error);
      return {
        templates: [],
        source: 'none'
      };
    }
  }, []);

  /**
   * Get all available templates for a given context (for manual selection)
   */
  const getAvailableTemplates = useCallback(async (
    projectType?: string,
    municipalityId?: string | null
  ) => {
    try {
      let query = supabase
        .from('task_templates')
        .select(`
          *,
          municipalities:municipality_id (id, name),
          licensing_phases:licensing_phase_id (id, name)
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (projectType) {
        query = query.or(`project_type.eq.${projectType},project_type.is.null`);
      }

      if (municipalityId) {
        query = query.or(`municipality_id.eq.${municipalityId},municipality_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as TaskTemplate[];
    } catch (error) {
      console.error('Error fetching available templates:', error);
      return [];
    }
  }, []);

  return {
    resolveTemplate,
    getAvailableTemplates
  };
}
