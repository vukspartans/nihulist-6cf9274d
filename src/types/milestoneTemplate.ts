export interface MilestoneTemplate {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  project_type: string | null;
  municipality_id: string | null;
  advisor_specialty: string | null;
  percentage_of_total: number;
  fixed_amount: number | null;
  currency: string;
  trigger_type: 'task_completion' | 'manual' | 'date_based';
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  municipalities?: { id: string; name: string } | null;
  linked_tasks?: MilestoneTemplateTask[];
}

export interface MilestoneTemplateTask {
  id: string;
  milestone_template_id: string;
  task_template_id: string;
  is_critical: boolean;
  display_order: number;
  created_at: string;
  // Joined data
  task_templates?: { id: string; name: string } | null;
}

export interface CreateMilestoneTemplateInput {
  name: string;
  name_en?: string;
  description?: string;
  project_type?: string;
  municipality_id?: string;
  advisor_specialty?: string;
  percentage_of_total: number;
  fixed_amount?: number;
  currency?: string;
  trigger_type?: 'task_completion' | 'manual' | 'date_based';
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateMilestoneTemplateInput extends Partial<CreateMilestoneTemplateInput> {
  id: string;
}

export type TriggerType = 'task_completion' | 'manual' | 'date_based';

export const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: 'task_completion', label: 'השלמת משימות' },
  { value: 'manual', label: 'ידני' },
  { value: 'date_based', label: 'לפי תאריך' },
];
