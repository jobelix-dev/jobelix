import { stringify } from 'yaml';

interface StudentData {
  student_name: string;
  mail_adress: string;
  phone_number?: string;
  address?: string;
}

interface AcademicData {
  school_name: string;
  degree: string;
  start_year?: number | null;
  start_month?: number | null;
  end_year?: number | null;
  end_month?: number | null;
  description?: string;
}

interface ExperienceData {
  organisation_name: string;
  position_name: string;
  start_year?: number | null;
  start_month?: number | null;
  end_year?: number | null;
  end_month?: number | null;
  description?: string;
}

interface ProjectData {
  project_name: string;
  description?: string;
  link?: string;
}

interface SkillData {
  skill_name: string;
}

interface LanguageData {
  language_name: string;
  proficiency_level?: string;
}

interface CertificationData {
  name: string;
  credential_url?: string;
}

interface SocialLinksData {
  github?: string;
  linkedin?: string;
  stackoverflow?: string;
  kaggle?: string;
  leetcode?: string;
}

interface ProfileData {
  student: StudentData;
  academic: AcademicData[];
  experience: ExperienceData[];
  projects: ProjectData[];
  skills: SkillData[];
  languages: LanguageData[];
  certifications: CertificationData[];
  socialLinks: SocialLinksData | null;
}

// Resume YAML structure interfaces
interface ResumeProfile {
  network: string;
  url?: string;
  username: string;
}

interface ResumeBasics {
  email: string;
  name: string;
  location?: { city: string };
  phone?: string;
  profiles?: ResumeProfile[];
}

interface ResumeEducationEntry {
  area: string;
  institution: string;
  startDate?: string;
  endDate?: string;
}

interface ResumeProjectEntry {
  name: string;
  description?: string;
  url?: string;
}

interface ResumeSkillEntry {
  name: string;
  keywords: string[];
}

interface ResumeWorkEntry {
  name: string;
  position: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

interface ResumeCertificateEntry {
  name: string;
  url?: string;
}

interface ResumeStructure {
  basics: ResumeBasics;
  education?: ResumeEducationEntry[];
  meta?: { breaks_before: { education: boolean } };
  projects?: ResumeProjectEntry[];
  skills?: ResumeSkillEntry[];
  work?: ResumeWorkEntry[];
  certificates?: ResumeCertificateEntry[];
}

function extractUsername(url: string | null | undefined, platform: string): string | null {
  if (!url) return null;
  
  try {
    const cleanUrl = url.trim();
    
    switch (platform) {
      case 'github':
        // github.com/username or github.com/username/
        const githubMatch = cleanUrl.match(/github\.com\/([^\/]+)/);
        return githubMatch ? githubMatch[1] : null;
        
      case 'linkedin':
        // linkedin.com/in/username or linkedin.com/in/username/
        const linkedinMatch = cleanUrl.match(/linkedin\.com\/in\/([^\/]+)/);
        return linkedinMatch ? linkedinMatch[1] : null;
        
      case 'stackoverflow':
        // stackoverflow.com/users/12345/username
        const soMatch = cleanUrl.match(/stackoverflow\.com\/users\/\d+\/([^\/]+)/);
        return soMatch ? soMatch[1] : null;
        
      case 'kaggle':
        // kaggle.com/username
        const kaggleMatch = cleanUrl.match(/kaggle\.com\/([^\/]+)/);
        return kaggleMatch ? kaggleMatch[1] : null;
        
      case 'leetcode':
        // leetcode.com/username or leetcode.com/u/username
        const leetcodeMatch = cleanUrl.match(/leetcode\.com\/(?:u\/)?([^\/]+)/);
        return leetcodeMatch ? leetcodeMatch[1] : null;
        
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error extracting username from ${url}:`, error);
    return null;
  }
}

function formatDate(year: number | null | undefined, month: number | null | undefined): string | null {
  if (!year) return null;
  
  try {
    // Format as YYYY-MM-DD string (using first day of month)
    const monthStr = month ? String(month).padStart(2, '0') : '01';
    // Ensure it's returned as a string, not a date object
    return String(`${year}-${monthStr}-01`);
  } catch (_error) {
    return null;
  }
}

export function generateResumeYaml(data: ProfileData): string {
  const { student, academic, experience, projects, skills, languages, certifications, socialLinks } = data;
  
  // Build the resume object structure
  const resume: ResumeStructure = {
    basics: {
      email: student.mail_adress || '',
      name: student.student_name || 'Unknown',
    }
  };

  // Add optional basic fields
  if (student.address) {
    resume.basics.location = {
      city: student.address
    };
  }

  if (student.phone_number) {
    resume.basics.phone = student.phone_number;
  }

  // Social links (profiles)
  if (socialLinks) {
    const profiles: ResumeProfile[] = [];
    
    const github = extractUsername(socialLinks.github, 'github');
    if (github) {
      profiles.push({
        network: 'Github',
        url: socialLinks.github,
        username: github
      });
    }
    
    const linkedin = extractUsername(socialLinks.linkedin, 'linkedin');
    if (linkedin) {
      profiles.push({
        network: 'Linkedin',
        url: socialLinks.linkedin,
        username: linkedin
      });
    }
    
    const stackoverflow = extractUsername(socialLinks.stackoverflow, 'stackoverflow');
    if (stackoverflow) {
      profiles.push({
        network: 'StackOverflow',
        url: socialLinks.stackoverflow,
        username: stackoverflow
      });
    }
    
    const kaggle = extractUsername(socialLinks.kaggle, 'kaggle');
    if (kaggle) {
      profiles.push({
        network: 'Kaggle',
        url: socialLinks.kaggle,
        username: kaggle
      });
    }
    
    const leetcode = extractUsername(socialLinks.leetcode, 'leetcode');
    if (leetcode) {
      profiles.push({
        network: 'Leetcode',
        url: socialLinks.leetcode,
        username: leetcode
      });
    }
    
    if (profiles.length > 0) {
      resume.basics.profiles = profiles;
    }
  }

  // Education
  if (academic.length > 0) {
    resume.education = academic.map(edu => {
      const entry: ResumeEducationEntry = {
        area: edu.degree || 'Unknown',
        institution: edu.school_name || 'Unknown',
      };
      
      const startDate = formatDate(edu.start_year, edu.start_month);
      const endDate = formatDate(edu.end_year, edu.end_month);
      
      if (startDate) entry.startDate = startDate;
      if (endDate) entry.endDate = endDate;
      
      return entry;
    });
  }

  // Meta section
  resume.meta = {
    breaks_before: {
      education: true
    }
  };

  // Projects
  if (projects.length > 0) {
    resume.projects = projects.map(proj => {
      const entry: ResumeProjectEntry = {
        name: proj.project_name || 'Unnamed Project',
      };
      
      if (proj.description) entry.description = proj.description;
      if (proj.link) entry.url = proj.link;
      
      return entry;
    });
  }

  // Skills section
  if (skills.length > 0 || languages.length > 0) {
    const skillsList: ResumeSkillEntry[] = [];
    
    // General skills
    if (skills.length > 0) {
      skillsList.push({
        name: 'General',
        keywords: skills.map(skill => skill.skill_name).filter(Boolean)
      });
    }
    
    // Languages as a skill category
    if (languages.length > 0) {
      skillsList.push({
        name: 'Languages',
        keywords: languages.map(lang => {
          const langName = lang.language_name || 'Unknown';
          const level = lang.proficiency_level || 'Unknown';
          return `${langName}: ${level}`;
        })
      });
    }
    
    resume.skills = skillsList;
  }

  // Work (Experience)
  if (experience.length > 0) {
    resume.work = experience.map(exp => {
      const entry: ResumeWorkEntry = {
        name: exp.organisation_name || 'Unknown',
        position: exp.position_name || 'Unknown',
      };
      
      const startDate = formatDate(exp.start_year, exp.start_month);
      const endDate = formatDate(exp.end_year, exp.end_month);
      
      if (startDate) entry.startDate = startDate;
      if (endDate) entry.endDate = endDate;
      
      if (exp.description) {
        // Split description into bullet points
        const lines = exp.description.split('\n').filter(line => line.trim());
        entry.highlights = lines.map(line => 
          line.trim().replace(/^[-•]\s*/, '')
        ).filter(Boolean);
      }
      
      return entry;
    });
  }

  // Certificates (Certifications)
  if (certifications.length > 0) {
    resume.certificates = certifications.map(cert => {
      const entry: ResumeCertificateEntry = {
        name: cert.name || 'Unnamed Certification',
      };
      
      if (cert.credential_url) entry.url = cert.credential_url;
      
      return entry;
    });
  }

  // Convert to YAML using the official library
  // Use stringifyString option to ensure dates are quoted as strings
  return stringify(resume, {
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN'
  });
}
