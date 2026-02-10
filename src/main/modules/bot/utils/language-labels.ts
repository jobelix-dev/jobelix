/**
 * Language Labels and Translations
 * 
 * Provides translations for resume section labels and language utilities
 * for multi-language support in form answers and PDF generation.
 */

/**
 * Resume section labels translated to each supported language
 */
export const RESUME_SECTION_LABELS: Record<string, Record<string, string>> = {
  en: {
    contact: 'Contact',
    profiles: 'Profiles',
    skills: 'Skills',
    professionalSummary: 'Professional Summary',
    experience: 'Experience',
    education: 'Education',
    projects: 'Projects',
    certifications: 'Certifications',
    languages: 'Languages',
    achievements: 'Achievements',
    references: 'References',
  },
  fr: {
    contact: 'Contact',
    profiles: 'Profils',
    skills: 'Compétences',
    professionalSummary: 'Résumé Professionnel',
    experience: 'Expérience',
    education: 'Formation',
    projects: 'Projets',
    certifications: 'Certifications',
    languages: 'Langues',
    achievements: 'Réalisations',
    references: 'Références',
  },
  de: {
    contact: 'Kontakt',
    profiles: 'Profile',
    skills: 'Fähigkeiten',
    professionalSummary: 'Berufsprofil',
    experience: 'Berufserfahrung',
    education: 'Ausbildung',
    projects: 'Projekte',
    certifications: 'Zertifizierungen',
    languages: 'Sprachen',
    achievements: 'Erfolge',
    references: 'Referenzen',
  },
  es: {
    contact: 'Contacto',
    profiles: 'Perfiles',
    skills: 'Habilidades',
    professionalSummary: 'Resumen Profesional',
    experience: 'Experiencia',
    education: 'Educación',
    projects: 'Proyectos',
    certifications: 'Certificaciones',
    languages: 'Idiomas',
    achievements: 'Logros',
    references: 'Referencias',
  },
  it: {
    contact: 'Contatto',
    profiles: 'Profili',
    skills: 'Competenze',
    professionalSummary: 'Profilo Professionale',
    experience: 'Esperienza',
    education: 'Istruzione',
    projects: 'Progetti',
    certifications: 'Certificazioni',
    languages: 'Lingue',
    achievements: 'Risultati',
    references: 'Referenze',
  },
  pt: {
    contact: 'Contato',
    profiles: 'Perfis',
    skills: 'Habilidades',
    professionalSummary: 'Resumo Profissional',
    experience: 'Experiência',
    education: 'Educação',
    projects: 'Projetos',
    certifications: 'Certificações',
    languages: 'Idiomas',
    achievements: 'Conquistas',
    references: 'Referências',
  },
  nl: {
    contact: 'Contact',
    profiles: 'Profielen',
    skills: 'Vaardigheden',
    professionalSummary: 'Professioneel Profiel',
    experience: 'Werkervaring',
    education: 'Opleiding',
    projects: 'Projecten',
    certifications: 'Certificeringen',
    languages: 'Talen',
    achievements: 'Prestaties',
    references: 'Referenties',
  },
  pl: {
    contact: 'Kontakt',
    profiles: 'Profile',
    skills: 'Umiejętności',
    professionalSummary: 'Profil Zawodowy',
    experience: 'Doświadczenie',
    education: 'Wykształcenie',
    projects: 'Projekty',
    certifications: 'Certyfikaty',
    languages: 'Języki',
    achievements: 'Osiągnięcia',
    references: 'Referencje',
  },
  sv: {
    contact: 'Kontakt',
    profiles: 'Profiler',
    skills: 'Färdigheter',
    professionalSummary: 'Professionell Sammanfattning',
    experience: 'Erfarenhet',
    education: 'Utbildning',
    projects: 'Projekt',
    certifications: 'Certifieringar',
    languages: 'Språk',
    achievements: 'Prestationer',
    references: 'Referenser',
  },
  da: {
    contact: 'Kontakt',
    profiles: 'Profiler',
    skills: 'Færdigheder',
    professionalSummary: 'Professionel Profil',
    experience: 'Erfaring',
    education: 'Uddannelse',
    projects: 'Projekter',
    certifications: 'Certificeringer',
    languages: 'Sprog',
    achievements: 'Præstationer',
    references: 'Referencer',
  },
  no: {
    contact: 'Kontakt',
    profiles: 'Profiler',
    skills: 'Ferdigheter',
    professionalSummary: 'Profesjonell Profil',
    experience: 'Erfaring',
    education: 'Utdanning',
    projects: 'Prosjekter',
    certifications: 'Sertifiseringer',
    languages: 'Språk',
    achievements: 'Prestasjoner',
    references: 'Referanser',
  },
  fi: {
    contact: 'Yhteystiedot',
    profiles: 'Profiilit',
    skills: 'Taidot',
    professionalSummary: 'Ammatillinen Profiili',
    experience: 'Työkokemus',
    education: 'Koulutus',
    projects: 'Projektit',
    certifications: 'Sertifikaatit',
    languages: 'Kielet',
    achievements: 'Saavutukset',
    references: 'Suosittelijat',
  },
};

/**
 * Get translated resume section labels for a given language code
 * Falls back to English if language is not supported
 */
export function getResumeSectionLabels(languageCode: string): Record<string, string> {
  return RESUME_SECTION_LABELS[languageCode] || RESUME_SECTION_LABELS['en'];
}

/**
 * Get a specific section label in a given language
 * Falls back to English if language or section is not found
 */
export function getSectionLabel(languageCode: string, section: string): string {
  const labels = RESUME_SECTION_LABELS[languageCode] || RESUME_SECTION_LABELS['en'];
  return labels[section] || RESUME_SECTION_LABELS['en'][section] || section;
}

/**
 * Supported language codes for multi-language features
 */
export const SUPPORTED_LANGUAGE_CODES = [
  'en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'sv', 'da', 'no', 'fi'
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGE_CODES[number];

/**
 * Check if a language code is supported for multi-language features
 */
export function isLanguageSupported(code: string): code is SupportedLanguageCode {
  return SUPPORTED_LANGUAGE_CODES.includes(code as SupportedLanguageCode);
}
