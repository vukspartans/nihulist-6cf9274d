// Types for hierarchical task management

export interface HierarchicalTaskTemplate {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  phase: string | null;
  default_duration_days: number | null;
  advisor_specialty: string | null;
  is_milestone: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  municipality_id: string | null;
  licensing_phase_id: string | null;
  is_default: boolean;
  created_by_user_id: string | null;
  is_user_template: boolean;
  template_group_id: string | null;
  depends_on_template_id: string | null;
  // New hierarchy fields
  parent_template_id: string | null;
  hierarchy_path: string | null;
  hierarchy_level: number;
  wbs_code: string | null;
  // Joined data
  municipalities?: {
    id: string;
    name: string;
  } | null;
  licensing_phases?: {
    id: string;
    name: string;
  } | null;
  parent_template?: {
    id: string;
    name: string;
    wbs_code: string | null;
  } | null;
  // Computed for UI
  children?: HierarchicalTaskTemplate[];
  dependencies?: TemplateDependency[];
}

export interface TemplateDependency {
  id: string;
  template_id: string;
  depends_on_template_id: string;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_days: number;
  created_at: string;
  // Joined data
  depends_on_template?: {
    id: string;
    name: string;
    wbs_code: string | null;
  } | null;
}

export interface HierarchicalProjectTask {
  id: string;
  project_id: string;
  template_id: string | null;
  stage_id: string | null;
  payment_milestone_id: string | null;
  is_payment_critical: boolean;
  name: string;
  description: string | null;
  phase: string | null;
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled' | 'delayed';
  display_order: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  duration_days: number | null;
  assigned_advisor_id: string | null;
  assigned_user_id: string | null;
  progress_percent: number | null;
  is_milestone: boolean | null;
  is_blocked: boolean | null;
  block_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Hierarchy fields
  parent_task_id: string | null;
  hierarchy_path: string | null;
  hierarchy_level: number;
  wbs_code: string | null;
  // Joined data
  advisors?: {
    id: string;
    company_name: string | null;
  } | null;
  payment_milestone?: {
    id: string;
    name: string;
    status: string;
  } | null;
  parent_task?: {
    id: string;
    name: string;
    wbs_code: string | null;
  } | null;
  // Computed for UI
  children?: HierarchicalProjectTask[];
}

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';

export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  finish_to_start: 'סיום-להתחלה (FS)',
  start_to_start: 'התחלה-להתחלה (SS)',
  finish_to_finish: 'סיום-לסיום (FF)',
  start_to_finish: 'התחלה-לסיום (SF)',
};

export const DEPENDENCY_TYPE_SHORT: Record<DependencyType, string> = {
  finish_to_start: 'FS',
  start_to_start: 'SS',
  finish_to_finish: 'FF',
  start_to_finish: 'SF',
};
