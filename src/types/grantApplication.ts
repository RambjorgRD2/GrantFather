/**
 * Comprehensive TypeScript types for Grant Application system
 */

export interface GrantSection {
  introduction: string;
  need_statement: string;
  project_plan: string;
  budget: string;
  outcomes: string;
  conclusion: string;
  [key: string]: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logo_url?: string;
  mission?: string;
  org_type: 'nonprofit' | 'forprofit' | 'government' | 'educational' | 'other';
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  members_count?: number;
  primary_contact_user_id?: string;
  ui_language?: string;
  ai_response_language?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'member' | 'superadmin' | 'owner';
  created_at: string;
  updated_at: string;
}

export interface OrganizationWithRole {
  organization: Organization;
  userRole: UserRole;
}

export interface GrantApplication {
  id: string;
  user_id: string;
  organization_id: string;
  project_name: string;
  summary: string;
  funding_amount: number;
  target_audience: string;
  timeline_start: string;
  timeline_end: string;
  expected_impact: string;
  generated_draft?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  organization_mission?: string;
  // Optional organization data (when joined)
  organizations?: Organization;
}

export interface SectionRegenerationRequest {
  applicationId: string;
  section: keyof GrantSection;
  tone?: 'formal' | 'persuasive' | 'concise' | 'academic' | 'conversational';
  aiProvider?: string;
  model?: string;
  improvement?: string;
}

export interface SectionRegenerationResponse {
  success: boolean;
  section: keyof GrantSection;
  content: string;
  error?: string;
}

export interface AISettings {
  provider: string;
  model: string;
}

export interface SectionAISettings {
  [section: string]: AISettings;
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  models: string[];
  requiresApiKey: boolean;
  icon?: string;
}

export interface ToneOption {
  id: string;
  label: string;
  description?: string;
}

export interface SectionLabel {
  [key: string]: string;
}

export interface ApplicationContext {
  id: string;
  project_name: string;
  summary: string;
  funding_amount: number;
  target_audience: string;
  timeline_start: string;
  timeline_end: string;
  expected_impact: string;
  organizations: {
    name: string;
    org_type: string;
    mission?: string;
  };
}

// AI Provider Context Type
export interface AIProviderContextType {
  globalSettings: AISettings;
  sectionSettings: SectionAISettings;
  updateGlobalSettings: (settings: AISettings) => void;
  updateSectionSettings: (section: string, settings: AISettings) => void;
  getSectionSettings: (section: string) => AISettings;
  isLoading: boolean;
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  applicationId?: string;
  organizationId?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userMessage: string;
}

export interface KnowledgeBaseItem {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SystemPrompt {
  id: string;
  user_id: string;
  organization_id?: string;
  section_name: string;
  prompt_template: string;
  ai_provider?: string;
  ai_model?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationSuggestion {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  suggested_funding_amount?: number;
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
  updated_at: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface GrantApplicationFormData {
  project_name: string;
  summary: string;
  funding_amount: number;
  target_audience: string;
  timeline_start: string;
  timeline_end: string;
  expected_impact: string;
}

export interface OrganizationFormData {
  name: string;
  description?: string;
  website?: string;
  mission?: string;
  org_type: Organization['org_type'];
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

// Hook return types
export interface UseGrantApplicationReturn {
  application: GrantApplication | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  updateApplication: (data: Partial<GrantApplication>) => Promise<void>;
  deleteApplication: () => Promise<void>;
}

export interface UseOrganizationsReturn {
  organizations: OrganizationWithRole[];
  activeOrganization: Organization | null;
  activeOrganizationRole: UserRole | null;
  hasMultipleOrganizations: boolean;
  selectOrganization: (organizationId: string) => void;
  loading: boolean;
}

export interface UseAIProviderReturn {
  globalSettings: AISettings;
  sectionSettings: SectionAISettings;
  updateGlobalSettings: (settings: AISettings) => void;
  updateSectionSettings: (section: string, settings: AISettings) => void;
  getSectionSettings: (section: string) => AISettings;
  isLoading: boolean;
}

// Event types
export interface SectionChangeEvent {
  section: keyof GrantSection;
  content: string;
  timestamp: string;
}

export interface AIGenerationEvent {
  section: keyof GrantSection;
  provider: string;
  model: string;
  success: boolean;
  duration: number;
  timestamp: string;
}

// Utility types
export type GrantSectionKey = keyof GrantSection;

export type OrganizationType = Organization['org_type'];

export type UserRoleType = UserRole['role'];

export type ApplicationStatus = GrantApplication['status'];

export type ErrorSeverity = ErrorDetails['severity'];

// Constants
export const GRANT_SECTIONS: GrantSectionKey[] = [
  'introduction',
  'need_statement',
  'project_plan',
  'budget',
  'outcomes',
  'conclusion',
];

export const ORGANIZATION_TYPES: OrganizationType[] = [
  'nonprofit',
  'forprofit',
  'government',
  'educational',
  'other',
];

export const USER_ROLES: UserRoleType[] = [
  'admin',
  'member',
  'superadmin',
  'owner',
];

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
];

export const ERROR_SEVERITIES: ErrorSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
];
