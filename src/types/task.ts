export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled' | 'delayed';

export interface ProjectTask {
  id: string;
  project_id: string;
  template_id?: string | null;
  stage_id?: string | null;
  payment_milestone_id?: string | null;
  is_payment_critical?: boolean;
  name: string;
  description?: string | null;
  phase?: string | null;
  status: TaskStatus;
  display_order?: number | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  duration_days?: number | null;
  assigned_advisor_id?: string | null;
  assigned_user_id?: string | null;
  progress_percent?: number | null;
  is_milestone?: boolean | null;
  is_blocked?: boolean | null;
  block_reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Joined data
  advisors?: {
    id: string;
    company_name: string | null;
  } | null;
  // Payment milestone joined data
  payment_milestone?: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export interface ProjectLicensingStage {
  id: string;
  project_id: string;
  licensing_phase_id: string | null;
  name: string;
  description?: string | null;
  display_order: number;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  progress_percent: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_days: number;
  created_at: string;
  // Joined data
  blocking_task?: {
    id: string;
    name: string;
    status: TaskStatus;
  } | null;
}

export interface ProjectAdvisorOption {
  id: string;
  advisor_id: string;
  company_name: string | null;
}
