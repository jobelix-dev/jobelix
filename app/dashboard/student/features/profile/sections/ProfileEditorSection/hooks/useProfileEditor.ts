/**
 * useProfileEditor Hook
 * 
 * Manages all state manipulation logic for the profile editor.
 * Uses small immutable helpers for CRUD operations.
 */

import { useCallback } from 'react';
import { 
  ExtractedResumeData, 
  EducationEntry, 
  ExperienceEntry, 
  ProjectEntry, 
  SkillEntry, 
  LanguageEntry, 
  PublicationEntry, 
  CertificationEntry, 
  SocialLinkEntry 
} from '@/lib/shared/types';

interface UseProfileEditorProps {
  data: ExtractedResumeData;
  onChange: (data: ExtractedResumeData) => void;
}

function replaceAt<T>(items: T[], index: number, updater: (item: T) => T): T[] {
  return items.map((item, currentIndex) =>
    currentIndex === index ? updater(item) : item
  );
}

// Default items for each entry type
const defaultEducation: EducationEntry = {
  school_name: '',
  degree: '',
  description: null,
  start_year: null,
  start_month: null,
  end_year: null,
  end_month: null,
  confidence: 'high',
};

const defaultExperience: ExperienceEntry = {
  organisation_name: '',
  position_name: '',
  description: null,
  start_year: null,
  start_month: null,
  end_year: null,
  end_month: null,
  confidence: 'high',
};

const defaultProject: ProjectEntry = {
  project_name: '',
  description: null,
  link: null,
};

const defaultPublication: PublicationEntry = {
  title: '',
  journal_name: null,
  description: null,
  publication_year: null,
  publication_month: null,
  link: null,
};

const defaultCertification: CertificationEntry = {
  name: '',
  issuing_organization: null,
  url: null,
};

const defaultLanguage: LanguageEntry = {
  language_name: '',
  proficiency_level: 'Intermediate',
};

const defaultSkill: SkillEntry = {
  skill_name: '',
  skill_slug: '',
};

export function useProfileEditor({ data, onChange }: UseProfileEditorProps) {
  // Basic field update
  const updateField = useCallback((field: keyof ExtractedResumeData, value: unknown) => {
    onChange({ ...data, [field]: value });
  }, [data, onChange]);
  
  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<ExtractedResumeData>) => {
    onChange({ ...data, ...updates });
  }, [data, onChange]);

  // Array CRUD handlers
  const addEducation = useCallback(() => {
    onChange({ ...data, education: [...data.education, defaultEducation] });
  }, [data, onChange]);
  const updateEducation = useCallback((index: number, field: keyof EducationEntry, value: unknown) => {
    onChange({
      ...data,
      education: replaceAt(data.education, index, (entry) => ({ ...entry, [field]: value })),
    });
  }, [data, onChange]);
  const removeEducation = useCallback((index: number) => {
    onChange({ ...data, education: data.education.filter((_, i) => i !== index) });
  }, [data, onChange]);

  const addExperience = useCallback(() => {
    onChange({ ...data, experience: [...data.experience, defaultExperience] });
  }, [data, onChange]);
  const updateExperience = useCallback((index: number, field: keyof ExperienceEntry, value: unknown) => {
    onChange({
      ...data,
      experience: replaceAt(data.experience, index, (entry) => ({ ...entry, [field]: value })),
    });
  }, [data, onChange]);
  const removeExperience = useCallback((index: number) => {
    onChange({ ...data, experience: data.experience.filter((_, i) => i !== index) });
  }, [data, onChange]);

  const addProject = useCallback(() => {
    onChange({ ...data, projects: [...data.projects, defaultProject] });
  }, [data, onChange]);
  const updateProject = useCallback((index: number, field: keyof ProjectEntry, value: unknown) => {
    onChange({
      ...data,
      projects: replaceAt(data.projects, index, (entry) => ({ ...entry, [field]: value })),
    });
  }, [data, onChange]);
  const removeProject = useCallback((index: number) => {
    onChange({ ...data, projects: data.projects.filter((_, i) => i !== index) });
  }, [data, onChange]);

  const updateSkills = useCallback((items: SkillEntry[]) => {
    onChange({ ...data, skills: items });
  }, [data, onChange]);
  const addSkill = useCallback(() => {
    onChange({ ...data, skills: [...data.skills, defaultSkill] });
  }, [data, onChange]);

  const addLanguage = useCallback(() => {
    onChange({ ...data, languages: [...data.languages, defaultLanguage] });
  }, [data, onChange]);
  const updateLanguages = useCallback((items: LanguageEntry[]) => {
    onChange({ ...data, languages: items });
  }, [data, onChange]);

  const addPublication = useCallback(() => {
    onChange({ ...data, publications: [...data.publications, defaultPublication] });
  }, [data, onChange]);
  const updatePublication = useCallback((index: number, field: keyof PublicationEntry, value: unknown) => {
    onChange({
      ...data,
      publications: replaceAt(data.publications, index, (entry) => ({ ...entry, [field]: value })),
    });
  }, [data, onChange]);
  const removePublication = useCallback((index: number) => {
    onChange({ ...data, publications: data.publications.filter((_, i) => i !== index) });
  }, [data, onChange]);

  const addCertification = useCallback(() => {
    onChange({ ...data, certifications: [...data.certifications, defaultCertification] });
  }, [data, onChange]);
  const updateCertification = useCallback((index: number, field: keyof CertificationEntry, value: unknown) => {
    onChange({
      ...data,
      certifications: replaceAt(data.certifications, index, (entry) => ({ ...entry, [field]: value })),
    });
  }, [data, onChange]);
  const removeCertification = useCallback((index: number) => {
    onChange({ ...data, certifications: data.certifications.filter((_, i) => i !== index) });
  }, [data, onChange]);

  // Social links (single object, not array)
  const updateSocialLinks = useCallback((social_links: SocialLinkEntry) => {
    onChange({ ...data, social_links });
  }, [data, onChange]);

  return {
    // Basic fields
    updateField,
    updateFields,
    
    // Education
    addEducation,
    updateEducation,
    removeEducation,
    
    // Experience
    addExperience,
    updateExperience,
    removeExperience,
    
    // Projects
    addProject,
    updateProject,
    removeProject,
    
    // Skills
    updateSkills,
    addSkill,
    
    // Languages
    addLanguage,
    updateLanguages,
    
    // Publications
    addPublication,
    updatePublication,
    removePublication,
    
    // Certifications
    addCertification,
    updateCertification,
    removeCertification,
    
    // Social Links
    updateSocialLinks,
  };
}
