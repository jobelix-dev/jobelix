export interface CompanyOffer {
  id: string;
  company_id: string;
  created_at?: string;
  position_name: string;
  description?: string | null;
  status?: 'draft' | 'published' | 'closed';
  published_at?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_period?: 'hour' | 'day' | 'month' | 'year' | null;
  equity?: boolean | null;
  equity_range?: string | null;
  remote_mode?: 'onsite' | 'hybrid' | 'remote' | null;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern' | null;
  availability?: string | null;
  mission?: string | null;
  stage?: string | null;
  team_size?: number | null;
  seniority?: string | null;
}

export interface DateObject {
  year: number;
  month: number | null; // 1-12, nullable for "just year"
}

export interface OfferBasicInfo {
  position_name: string;
  description: string | null;
}

export interface OfferCompensation {
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string; // 3-char code (EUR, USD, GBP)
  salary_period: 'hour' | 'day' | 'month' | 'year' | null;
  equity: boolean;
  equity_range: string | null;
}

export interface OfferWorkConfig {
  remote_mode: 'onsite' | 'hybrid' | 'remote' | null;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern' | null;
  availability: string | null;
}

export interface OfferSkillEntry {
  skill_slug: string;
  skill_text: string;
  importance: 'must' | 'nice';
  level?: string | null;
  years?: number | null;
}

export interface OfferLocationEntry {
  city?: string | null;
  country?: string | null;
}

export interface OfferResponsibilityEntry {
  text: string;
}

export interface OfferCapabilityEntry {
  text: string;
  importance: 'must' | 'nice';
}

export interface OfferQuestionEntry {
  question: string;
}

export interface OfferPerkEntry {
  text: string;
}

export interface OfferDraftData {
  basic_info: OfferBasicInfo;
  compensation: OfferCompensation;
  work_config: OfferWorkConfig;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'executive' | null;
  skills: OfferSkillEntry[];
  locations: OfferLocationEntry[];
  responsibilities: OfferResponsibilityEntry[];
  capabilities: OfferCapabilityEntry[];
  questions: OfferQuestionEntry[];
  perks: OfferPerkEntry[];
}

export interface CompanyOfferDraft {
  id: string;
  company_id: string;
  offer_id: string | null;
  basic_info: OfferBasicInfo;
  compensation: OfferCompensation;
  work_config: OfferWorkConfig;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'executive' | null;
  skills: OfferSkillEntry[];
  locations: OfferLocationEntry[];
  responsibilities: OfferResponsibilityEntry[];
  capabilities: OfferCapabilityEntry[];
  questions: OfferQuestionEntry[];
  perks: OfferPerkEntry[];
  status: 'editing' | 'ready_to_publish';
  created_at: string;
  updated_at: string;
}
