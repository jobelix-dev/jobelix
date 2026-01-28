import * as fs from "fs";
import * as yaml from "js-yaml";
import { createLogger } from "../utils/logger.js";
const log = createLogger("ResumeModel");
function loadResume(resumePath) {
  log.info(`Loading resume from: ${resumePath}`);
  if (!fs.existsSync(resumePath)) {
    throw new Error(`Resume file not found: ${resumePath}`);
  }
  const content = fs.readFileSync(resumePath, "utf-8");
  return parseResumeYaml(content);
}
function parseResumeYaml(content) {
  const data = yaml.load(content);
  const basics = data.basics || data.personal_information || {};
  const work = data.work || data.experience_details || [];
  const education = data.education || data.education_details || [];
  const resume = {
    personalInformation: parsePersonalInformation(basics, data),
    selfIdentification: parseSelfIdentification(data.self_identification),
    legalAuthorization: parseLegalAuthorization(data.legal_authorization),
    workPreferences: parseWorkPreferences(data.work_preferences),
    educationDetails: education.map(parseEducation),
    experienceDetails: work.map(parseExperience),
    availability: parseAvailability(data.availability),
    salaryExpectations: parseSalaryExpectations(data.salary_expectations),
    languages: parseLanguages(data.languages),
    interests: data.interests,
    achievements: data.achievements,
    certifications: data.certifications,
    skills: parseSkills(data.skills)
  };
  log.info(`Resume loaded: ${resume.personalInformation.name} ${resume.personalInformation.surname}`);
  return resume;
}
function parsePersonalInformation(basics, root) {
  const location = basics.location || {};
  return {
    name: basics.name?.split(" ")[0] || "",
    surname: basics.name?.split(" ").slice(1).join(" ") || "",
    dateOfBirth: basics.dateOfBirth || "",
    country: location.countryCode || location.country || "",
    city: location.city || "",
    phone: basics.phone || "",
    phonePrefix: basics.phonePrefix || extractPhonePrefix(basics.phone),
    email: basics.email || "",
    github: extractProfile(basics.profiles, "github") || basics.github || "",
    linkedin: extractProfile(basics.profiles, "linkedin") || basics.linkedin || ""
  };
}
function extractPhonePrefix(phone) {
  if (!phone) return "";
  const match = phone.match(/^\+(\d{1,3})/);
  return match ? `+${match[1]}` : "";
}
function extractProfile(profiles, network) {
  if (!Array.isArray(profiles)) return "";
  const profile = profiles.find(
    (p) => p.network?.toLowerCase() === network
  );
  return profile?.url || "";
}
function parseSelfIdentification(data) {
  return {
    gender: data?.gender || "",
    pronouns: data?.pronouns || "they/them",
    veteran: data?.veteran || "No",
    disability: data?.disability || "No",
    ethnicity: data?.ethnicity || ""
  };
}
function parseLegalAuthorization(data) {
  return {
    euWorkAuthorization: data?.euWorkAuthorization || "Yes",
    usWorkAuthorization: data?.usWorkAuthorization || "No",
    requiresUsVisa: data?.requiresUsVisa || "Yes",
    legallyAllowedToWorkInUs: data?.legallyAllowedToWorkInUs || "No",
    requiresUsSponsorship: data?.requiresUsSponsorship || "Yes",
    requiresEuVisa: data?.requiresEuVisa || "No",
    legallyAllowedToWorkInEu: data?.legallyAllowedToWorkInEu || "Yes",
    requiresEuSponsorship: data?.requiresEuSponsorship || "No"
  };
}
function parseWorkPreferences(data) {
  return {
    remoteWork: data?.remoteWork || "Yes",
    inPersonWork: data?.inPersonWork || "Yes",
    openToRelocation: data?.openToRelocation || "Yes",
    willingToCompleteAssessments: data?.willingToCompleteAssessments || "Yes",
    willingToUndergoDrugTests: data?.willingToUndergoDrugTests || "Yes",
    willingToUndergoBackgroundChecks: data?.willingToUndergoBackgroundChecks || "Yes"
  };
}
function parseEducation(data) {
  return {
    degree: data.studyType || data.degree || "",
    university: data.institution || data.university || "",
    graduationYear: data.endDate || data.graduationYear || "",
    fieldOfStudy: data.area || data.fieldOfStudy || "",
    gpa: data.gpa
  };
}
function parseExperience(data) {
  const startDate = data.startDate || "";
  const endDate = data.endDate || "Present";
  const highlights = data.highlights || [];
  const keyResponsibilities = {};
  highlights.forEach((h, i) => {
    keyResponsibilities[`responsibility_${i + 1}`] = h;
  });
  return {
    position: data.position || data.title || "",
    company: data.name || data.company || "",
    employmentPeriod: `${startDate} - ${endDate}`,
    location: data.location || "",
    industry: data.industry,
    keyResponsibilities,
    skillsAcquired: {}
  };
}
function parseAvailability(data) {
  return {
    noticePeriod: data?.noticePeriod || "2 weeks"
  };
}
function parseSalaryExpectations(data) {
  return {
    salaryRangeUSD: data?.salaryRangeUSD || ""
  };
}
function parseLanguages(data) {
  if (!Array.isArray(data)) return [];
  return data.map((lang) => ({
    language: lang.language || "",
    proficiency: lang.fluency || lang.proficiency || ""
  }));
}
function parseSkills(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((s) => {
      if (typeof s === "string") return s;
      if (typeof s === "object" && s !== null) {
        return s.name || "";
      }
      return "";
    }).filter(Boolean);
  }
  return [];
}
function resumeToNarrative(resume) {
  const { personalInformation: pi, experienceDetails, educationDetails, skills } = resume;
  let narrative = `${pi.name} ${pi.surname} is a professional`;
  if (experienceDetails.length > 0) {
    const recent = experienceDetails[0];
    narrative += ` currently working as ${recent.position} at ${recent.company}`;
  }
  if (pi.city && pi.country) {
    narrative += `, based in ${pi.city}, ${pi.country}`;
  }
  narrative += ".\n\n";
  if (experienceDetails.length > 0) {
    narrative += "Work Experience:\n";
    for (const exp of experienceDetails) {
      narrative += `- ${exp.position} at ${exp.company} (${exp.employmentPeriod})
`;
      const responsibilities = Object.values(exp.keyResponsibilities).slice(0, 3);
      for (const r of responsibilities) {
        narrative += `  \u2022 ${r}
`;
      }
    }
    narrative += "\n";
  }
  if (educationDetails.length > 0) {
    narrative += "Education:\n";
    for (const edu of educationDetails) {
      narrative += `- ${edu.degree} in ${edu.fieldOfStudy} from ${edu.university} (${edu.graduationYear})
`;
    }
    narrative += "\n";
  }
  if (skills && skills.length > 0) {
    narrative += `Skills: ${skills.join(", ")}
`;
  }
  return narrative;
}
function getResumeSection(resume, section) {
  switch (section) {
    case "personal_information":
      return JSON.stringify(resume.personalInformation, null, 2);
    case "self_identification":
      return JSON.stringify(resume.selfIdentification, null, 2);
    case "legal_authorization":
      return JSON.stringify(resume.legalAuthorization, null, 2);
    case "work_preferences":
      return JSON.stringify(resume.workPreferences, null, 2);
    case "education_details":
      return JSON.stringify(resume.educationDetails, null, 2);
    case "experience_details":
      return JSON.stringify(resume.experienceDetails, null, 2);
    case "availability":
      return JSON.stringify(resume.availability, null, 2);
    case "salary_expectations":
      return JSON.stringify(resume.salaryExpectations, null, 2);
    case "languages":
      return JSON.stringify(resume.languages, null, 2);
    case "interests":
      return resume.interests || "";
    case "cover_letter":
      return resumeToNarrative(resume);
    default:
      return resumeToNarrative(resume);
  }
}
export {
  getResumeSection,
  loadResume,
  parseResumeYaml,
  resumeToNarrative
};
//# sourceMappingURL=resume.js.map
