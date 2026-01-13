/**
 * useProfileEditor Hook
 * 
 * Manages all state manipulation logic for the profile editor.
 * Provides handlers for adding, updating, and removing entries.
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

export function useProfileEditor({ data, onChange }: UseProfileEditorProps) {
  
  // =====================================================================
  // BASIC FIELDS
  // =====================================================================
  
  const updateField = (field: keyof ExtractedResumeData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // =====================================================================
  // EDUCATION
  // =====================================================================
  
  const addEducation = () => {
    onChange({
      ...data,
      education: [
        ...data.education,
        {
          school_name: '',
          degree: '',
          description: null,
          start_year: null,
          start_month: null,
          end_year: null,
          end_month: null,
          confidence: 'high' as const,
        }
      ]
    });
  };

  const updateEducation = (index: number, field: keyof EducationEntry, value: any) => {
    const updated = [...data.education];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, education: updated });
  };

  const removeEducation = (index: number) => {
    onChange({
      ...data,
      education: data.education.filter((_, i) => i !== index)
    });
  };

  // =====================================================================
  // EXPERIENCE
  // =====================================================================
  
  const addExperience = () => {
    onChange({
      ...data,
      experience: [
        ...data.experience,
        {
          organisation_name: '',
          position_name: '',
          description: null,
          start_year: null,
          start_month: null,
          end_year: null,
          end_month: null,
          confidence: 'high' as const,
        }
      ]
    });
  };

  const updateExperience = (index: number, field: keyof ExperienceEntry, value: any) => {
    const updated = [...data.experience];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, experience: updated });
  };

  const removeExperience = (index: number) => {
    onChange({
      ...data,
      experience: data.experience.filter((_, i) => i !== index)
    });
  };

  // =====================================================================
  // PROJECTS
  // =====================================================================
  
  const addProject = () => {
    onChange({
      ...data,
      projects: [
        ...data.projects,
        {
          project_name: '',
          description: null,
          link: null,
        }
      ]
    });
  };

  const updateProject = (index: number, field: keyof ProjectEntry, value: any) => {
    const updated = [...data.projects];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, projects: updated });
  };

  const removeProject = (index: number) => {
    onChange({
      ...data,
      projects: data.projects.filter((_, i) => i !== index)
    });
  };

  // =====================================================================
  // SKILLS
  // =====================================================================
  
  const updateSkills = (skills: SkillEntry[]) => {
    onChange({ ...data, skills });
  };

  const addSkill = () => {
    onChange({
      ...data,
      skills: [
        ...data.skills,
        { skill_name: '', skill_slug: '' }
      ]
    });
  };

  // =====================================================================
  // LANGUAGES
  // =====================================================================
  
  const addLanguage = () => {
    onChange({
      ...data,
      languages: [
        ...data.languages,
        {
          language_name: '',
          proficiency_level: 'Intermediate' as const,
        }
      ]
    });
  };

  const updateLanguages = (languages: LanguageEntry[]) => {
    onChange({ ...data, languages });
  };

  // =====================================================================
  // PUBLICATIONS
  // =====================================================================
  
  const addPublication = () => {
    onChange({
      ...data,
      publications: [
        ...data.publications,
        {
          title: '',
          journal_name: null,
          description: null,
          publication_year: null,
          publication_month: null,
          link: null,
        }
      ]
    });
  };

  const updatePublication = (index: number, field: keyof PublicationEntry, value: any) => {
    const updated = [...data.publications];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, publications: updated });
  };

  const removePublication = (index: number) => {
    onChange({
      ...data,
      publications: data.publications.filter((_, i) => i !== index)
    });
  };

  // =====================================================================
  // CERTIFICATIONS
  // =====================================================================
  
  const addCertification = () => {
    onChange({
      ...data,
      certifications: [
        ...data.certifications,
        {
          name: '',
          issuing_organization: null,
          url: null,
        }
      ]
    });
  };

  const updateCertification = (index: number, field: keyof CertificationEntry, value: any) => {
    const updated = [...data.certifications];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, certifications: updated });
  };

  const removeCertification = (index: number) => {
    onChange({
      ...data,
      certifications: data.certifications.filter((_, i) => i !== index)
    });
  };

  // =====================================================================
  // SOCIAL LINKS
  // =====================================================================
  
  const updateSocialLinks = (social_links: SocialLinkEntry) => {
    onChange({ ...data, social_links });
  };

  // =====================================================================
  // RETURN ALL HANDLERS
  // =====================================================================
  
  return {
    // Basic fields
    updateField,
    
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
