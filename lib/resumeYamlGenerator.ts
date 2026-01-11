interface StudentData {
  student_name: string;
  mail_adress: string;
  phone_number?: string;
  address?: string;
}

interface AcademicData {
  school_name: string;
  degree: string;
  starting_date?: string;
  ending_date?: string;
  description?: string;
}

interface ExperienceData {
  organisation_name: string;
  position_name: string;
  starting_date?: string;
  ending_date?: string;
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

function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return null;
  }
}

function escapeYamlString(str: string | null | undefined): string {
  // Handle null/undefined
  if (!str) return '';
  
  // If string contains special characters, wrap in quotes
  if (str.includes(':') || str.includes('#') || str.includes('\n')) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

function formatTextBlock(text: string | null | undefined): string {
  if (!text) return '';
  
  // Convert to text block with proper indentation
  const lines = text.trim().split('\n');
  if (lines.length === 1) {
    return escapeYamlString(lines[0]);
  }
  
  // Multi-line text block
  return '|\n' + lines.map(line => `          ${line}`).join('\n');
}

export function generateResumeYaml(data: ProfileData): string {
  const { student, academic, experience, projects, skills, languages, certifications, socialLinks } = data;
  
  let yaml = '';
  
  // Basics section
  yaml += 'basics:\n';
  const email = student.mail_adress || '';
  yaml += `  email: "${email}"\n`;
  
  if (student.address) {
    yaml += '  location:\n';
    yaml += `    city: "${student.address}"\n`;
  }
  
  const name = student.student_name || 'Unknown';
  yaml += `  name: "${name}"\n`;
  
  if (student.phone_number) {
    yaml += `  phone: "${student.phone_number}"\n`;
  }
  
  // Social links (profiles)
  const socialEntries: string[] = [];
  if (socialLinks) {
    const github = extractUsername(socialLinks.github, 'github');
    const linkedin = extractUsername(socialLinks.linkedin, 'linkedin');
    const stackoverflow = extractUsername(socialLinks.stackoverflow, 'stackoverflow');
    const kaggle = extractUsername(socialLinks.kaggle, 'kaggle');
    const leetcode = extractUsername(socialLinks.leetcode, 'leetcode');
    
    if (github) {
      socialEntries.push(`    - network: "Github"\n      url: "${socialLinks.github}"\n      username: "${github}"`);
    }
    if (linkedin) {
      socialEntries.push(`    - network: "Linkedin"\n      url: "${socialLinks.linkedin}"\n      username: "${linkedin}"`);
    }
    if (stackoverflow) {
      socialEntries.push(`    - network: "StackOverflow"\n      url: "${socialLinks.stackoverflow}"\n      username: "${stackoverflow}"`);
    }
    if (kaggle) {
      socialEntries.push(`    - network: "Kaggle"\n      url: "${socialLinks.kaggle}"\n      username: "${kaggle}"`);
    }
    if (leetcode) {
      socialEntries.push(`    - network: "Leetcode"\n      url: "${socialLinks.leetcode}"\n      username: "${leetcode}"`);
    }
  }
  
  if (socialEntries.length > 0) {
    yaml += '  profiles:\n';
    yaml += socialEntries.join('\n') + '\n';
  }
  
  yaml += '\n';
  
  // Education
  if (academic.length > 0) {
    yaml += 'education:\n';
    academic.forEach(edu => {
      const degree = edu.degree || 'Unknown';
      const institution = edu.school_name || 'Unknown';
      yaml += `  - area: "${degree}"\n`;
      yaml += `    institution: "${institution}"\n`;
      
      const startDate = formatDate(edu.starting_date);
      const endDate = formatDate(edu.ending_date);
      if (startDate) {
        yaml += `    startDate: "${startDate}"\n`;
      }
      if (endDate) {
        yaml += `    endDate: "${endDate}"\n`;
      }
      
      yaml += '\n';
    });
  }
  
  // Meta section
  yaml += 'meta:\n';
  yaml += '  breaks_before:\n';
  yaml += '    education: true\n';
  yaml += '\n';
  
  // Projects
  if (projects.length > 0) {
    yaml += 'projects:\n';
    projects.forEach(proj => {
      const projectName = proj.project_name || 'Unnamed Project';
      yaml += `  - name: "${projectName}"\n`;
      
      if (proj.description) {
        const cleanDesc = proj.description.replace(/"/g, '\\"');
        yaml += `    description: "${cleanDesc}"\n`;
      }
      
      if (proj.link) {
        yaml += `    url: "${proj.link}"\n`;
      }
      
      // Note: No date field in database, skipping
    });
    yaml += '\n';
  }
  
  // Skills section
  if (skills.length > 0 || languages.length > 0) {
    yaml += 'skills:\n';
    
    // General skills
    if (skills.length > 0) {
      yaml += '  - name: "General"\n';
      yaml += '    keywords:\n';
      skills.forEach(skill => {
        const skillName = skill.skill_name || '';
        if (skillName) {
          yaml += `      - "${skillName}"\n`;
        }
      });
      yaml += '\n';
    }
    
    // Languages as a skill category
    if (languages.length > 0) {
      yaml += '  - name: "Languages"\n';
      yaml += '    keywords:\n';
      languages.forEach(lang => {
        const langName = lang.language_name || 'Unknown';
        const level = lang.proficiency_level || 'Unknown';
        yaml += `      - "${langName}: ${level}"\n`;
      });
      yaml += '\n';
    }
  }
  
  // Work (Experience)
  if (experience.length > 0) {
    yaml += 'work:\n';
    experience.forEach(exp => {
      const company = exp.organisation_name || 'Unknown';
      const position = exp.position_name || 'Unknown';
      yaml += `  - name: "${company}"\n`;
      yaml += `    position: "${position}"\n`;
      
      const startDate = formatDate(exp.starting_date);
      const endDate = formatDate(exp.ending_date);
      if (startDate) {
        yaml += `    startDate: "${startDate}"\n`;
      }
      if (endDate) {
        yaml += `    endDate: "${endDate}"\n`;
      }
      
      if (exp.description) {
        yaml += '    highlights:\n';
        // Split description into bullet points if it contains newlines or dashes
        const lines = exp.description.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const cleanLine = line.trim().replace(/^[-•]\s*/, '').replace(/"/g, '\\"');
          if (cleanLine) {
            yaml += `      - "${cleanLine}"\n`;
          }
        });
      }
    });
    yaml += '\n';
  }
  
  // Certificates (Certifications)
  if (certifications.length > 0) {
    yaml += 'certificates:\n';
    certifications.forEach(cert => {
      const certName = cert.name || 'Unnamed Certification';
      yaml += `  - name: "${certName}"\n`;
      if (cert.credential_url) {
        yaml += `    url: "${cert.credential_url}"\n`;
      }
    });
  }
  
  return yaml;
}
