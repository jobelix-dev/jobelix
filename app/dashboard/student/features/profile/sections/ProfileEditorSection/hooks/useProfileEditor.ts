/**
 * useProfileEditor Hook
 * 
 * Manages all state manipulation logic for the profile editor.
 * Uses factory pattern for DRY CRUD operations.
 * Callbacks are referentially stable via useRef to prevent child re-renders.
 */

import { useCallback, useRef } from 'react';
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
  // Keep latest data/onChange in refs so callbacks remain stable
  const dataRef = useRef(data);
  dataRef.current = data;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Basic field update - stable reference
  const updateField = useCallback((field: keyof ExtractedResumeData, value: unknown) => {
    onChangeRef.current({ ...dataRef.current, [field]: value });
  }, []);
  
  // Update multiple fields at once - stable reference
  const updateFields = useCallback((updates: Partial<ExtractedResumeData>) => {
    onChangeRef.current({ ...dataRef.current, ...updates });
  }, []);

  // Stable array CRUD handlers using refs
  const addEducation = useCallback(() => {
    onChangeRef.current({ ...dataRef.current, education: [...dataRef.current.education, defaultEducation] });
  }, []);
  const updateEducation = useCallback((index: number, field: keyof EducationEntry, value: unknown) => {
    const arr = [...dataRef.current.education];
    arr[index] = { ...arr[index], [field]: value };
    onChangeRef.current({ ...dataRef.current, education: arr });
  }, []);
  const removeEducation = useCallback((index: number) => {
    onChangeRef.current({ ...dataRef.current, education: dataRef.current.education.filter((_, i) => i !== index) });
  }, []);

  const addExperience = useCallback(() => {
    onChangeRef.current({ ...dataRef.current, experience: [...dataRef.current.experience, defaultExperience] });
  }, []);
  const updateExperience = useCallback((index: number, field: keyof ExperienceEntry, value: unknown) => {
    const arr = [...dataRef.current.experience];
    arr[index] = { ...arr[index], [field]: value };
    onChangeRef.current({ ...dataRef.current, experience: arr });
  }, []);
  const removeExperience = useCallback((index: number) => {
    onChangeRef.current({ ...dataRef.current, experience: dataRef.current.experience.filter((_, i) => i !== index) });
  }, []);

  const addProject = useCallback(() => {
    onChangeRef.current({ ...dataRef.current, projects: [...dataRef.current.projects, defaultProject] });
  }, []);
  const updateProject = useCallback((index: number, field: keyof ProjectEntry, value: unknown) => {
    const arr = [...dataRef.current.projects];
    arr[index] = { ...arr[index], [field]: value };
    onChangeRef.current({ ...dataRef.current, projects: arr });
  }, []);
  const removeProject = useCallback((index: number) => {
    onChangeRef.current({ ...dataRef.current, projects: dataRef.current.projects.filter((_, i) => i !== index) });
  }, []);

  const updateSkills = useCallback((items: SkillEntry[]) => {
    onChangeRef.current({ ...dataRef.current, skills: items });
  }, []);
  const addSkill = useCallback(() => {
    onChangeRef.current({ ...dataRef.current, skills: [...dataRef.current.skills, defaultSkill] });
  }, []);

  const addLanguage = useCallback(() => {
    onChangeRef.current({ ...dataRef.current, languages: [...dataRef.current.languages, defaultLanguage] });
  }, []);
  const updateLanguages = useCallback((items: LanguageEntry[]) => {
    onChangeRef.current({ ...dataRef.current, languages: items });
  }, []);

  const addPublication = useCallback(() => {
    onChangeRef.current({ ...dataRef.current, publications: [...dataRef.current.publications, defaultPublication] });
  }, []);
  const updatePublication = useCallback((index: number, field: keyof PublicationEntry, value: unknown) => {
    const arr = [...dataRef.current.publications];
    arr[index] = { ...arr[index], [field]: value };
    onChangeRef.current({ ...dataRef.current, publications: arr });
  }, []);
  const removePublication = useCallback((index: number) => {
    onChangeRef.current({ ...dataRef.current, publications: dataRef.current.publications.filter((_, i) => i !== index) });
  }, []);

  const addCertification = useCallback(() => {
    onChangeRef.current({ ...dataRef.current, certifications: [...dataRef.current.certifications, defaultCertification] });
  }, []);
  const updateCertification = useCallback((index: number, field: keyof CertificationEntry, value: unknown) => {
    const arr = [...dataRef.current.certifications];
    arr[index] = { ...arr[index], [field]: value };
    onChangeRef.current({ ...dataRef.current, certifications: arr });
  }, []);
  const removeCertification = useCallback((index: number) => {
    onChangeRef.current({ ...dataRef.current, certifications: dataRef.current.certifications.filter((_, i) => i !== index) });
  }, []);

  // Social links (single object, not array)
  const updateSocialLinks = useCallback((social_links: SocialLinkEntry) => {
    onChangeRef.current({ ...dataRef.current, social_links });
  }, []);

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
