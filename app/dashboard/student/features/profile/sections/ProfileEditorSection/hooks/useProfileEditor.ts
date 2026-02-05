/**
 * useProfileEditor Hook
 * 
 * Manages all state manipulation logic for the profile editor.
 * Uses factory pattern for DRY CRUD operations.
 */

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

// Factory for creating array CRUD handlers
function createArrayHandlers<T>(
  data: ExtractedResumeData,
  onChange: (data: ExtractedResumeData) => void,
  key: keyof ExtractedResumeData,
  defaultItem: T
) {
  return {
    add: () => {
      const currentArray = data[key] as T[];
      onChange({ ...data, [key]: [...currentArray, defaultItem] });
    },
    update: (index: number, field: keyof T, value: unknown) => {
      const currentArray = [...(data[key] as T[])];
      currentArray[index] = { ...currentArray[index], [field]: value };
      onChange({ ...data, [key]: currentArray });
    },
    remove: (index: number) => {
      const currentArray = data[key] as T[];
      onChange({ ...data, [key]: currentArray.filter((_, i) => i !== index) });
    },
    set: (items: T[]) => {
      onChange({ ...data, [key]: items });
    },
  };
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
  const updateField = (field: keyof ExtractedResumeData, value: unknown) => {
    onChange({ ...data, [field]: value });
  };
  
  // Update multiple fields at once (avoids stale closure issues)
  const updateFields = (updates: Partial<ExtractedResumeData>) => {
    onChange({ ...data, ...updates });
  };

  // Create handlers for each array type
  const education = createArrayHandlers<EducationEntry>(data, onChange, 'education', defaultEducation);
  const experience = createArrayHandlers<ExperienceEntry>(data, onChange, 'experience', defaultExperience);
  const projects = createArrayHandlers<ProjectEntry>(data, onChange, 'projects', defaultProject);
  const publications = createArrayHandlers<PublicationEntry>(data, onChange, 'publications', defaultPublication);
  const certifications = createArrayHandlers<CertificationEntry>(data, onChange, 'certifications', defaultCertification);
  const languages = createArrayHandlers<LanguageEntry>(data, onChange, 'languages', defaultLanguage);
  const skills = createArrayHandlers<SkillEntry>(data, onChange, 'skills', defaultSkill);

  // Social links (single object, not array)
  const updateSocialLinks = (social_links: SocialLinkEntry) => {
    onChange({ ...data, social_links });
  };

  return {
    // Basic fields
    updateField,
    updateFields,
    
    // Education
    addEducation: education.add,
    updateEducation: education.update,
    removeEducation: education.remove,
    
    // Experience
    addExperience: experience.add,
    updateExperience: experience.update,
    removeExperience: experience.remove,
    
    // Projects
    addProject: projects.add,
    updateProject: projects.update,
    removeProject: projects.remove,
    
    // Skills
    updateSkills: skills.set,
    addSkill: skills.add,
    
    // Languages
    addLanguage: languages.add,
    updateLanguages: languages.set,
    
    // Publications
    addPublication: publications.add,
    updatePublication: publications.update,
    removePublication: publications.remove,
    
    // Certifications
    addCertification: certifications.add,
    updateCertification: certifications.update,
    removeCertification: certifications.remove,
    
    // Social Links
    updateSocialLinks,
  };
}
