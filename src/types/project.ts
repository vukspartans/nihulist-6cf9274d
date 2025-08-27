// Shared Project interface that matches the database schema exactly
export interface Project {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  budget: number | null;
  advisors_budget: number | null;
  description: string | null;
  phase: string | null;
  status: string;
  owner_id: string;
  timeline_start: string;
  timeline_end: string;
  awaiting_banner_until: string | null;
  created_at: string;
  updated_at: string;
}

// For dashboard display where we only fetch certain fields
export interface ProjectSummary {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  budget: number | null;
  advisors_budget: number | null;
  phase: string | null;
  status: string;
  timeline_start: string;
  timeline_end: string;
  created_at: string;
}

// For forms and partial updates
export interface ProjectFormData {
  name: string;
  type: string;
  location: string;
  budget: number;
  advisors_budget: number | null;
  description: string | null;
  phase: string;
}