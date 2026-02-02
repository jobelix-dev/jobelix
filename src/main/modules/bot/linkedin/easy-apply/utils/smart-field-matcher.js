import { createLogger } from "../../../utils/logger.js";
const log = createLogger("SmartFieldMatcher");
class SmartFieldMatcher {
  constructor(resume) {
    this.personalInfo = resume?.personalInformation;
    this.educationDetails = resume?.educationDetails;
  }
  /**
   * Update resume data (e.g., when a new resume is loaded)
   */
  updateResume(resume) {
    this.personalInfo = resume.personalInformation;
    this.educationDetails = resume.educationDetails;
  }
  /**
   * Match a text/typeahead field by examining HTML element attributes
   * 
   * Detects:
   * - Location/City fields (geo-location pattern in ID)
   * - Phone number fields (phonenumber-nationalnumber pattern)
   * - Email fields
   * - Name fields
   */
  async matchByElementId(input) {
    if (!this.personalInfo) {
      log.debug("[SMART MATCH] No personal info available");
      return null;
    }
    try {
      if (await input.count() === 0) return null;
      const elementId = (await input.getAttribute("id") || "").toLowerCase();
      const elementName = (await input.getAttribute("name") || "").toLowerCase();
      log.debug(`[SMART MATCH] Element ID: ${elementId}, Name: ${elementName}`);
      if (elementId.includes("geo-location") || elementId.includes("location-geo") || elementName.includes("location")) {
        const city = this.personalInfo.city;
        if (city) {
          log.info(`[SMART MATCH] \u2705 City field detected: ${city}`);
          return { fieldType: "city", value: city, matchedBy: "element-id" };
        }
      }
      if (elementId.includes("phonenumber-nationalnumber") || elementId.includes("phone-national") || elementName.includes("phone")) {
        const phone = this.formatPhone();
        if (phone) {
          log.info(`[SMART MATCH] \u2705 Phone field detected: ${phone}`);
          return { fieldType: "phone", value: phone, matchedBy: "element-id" };
        }
      }
      if (elementId.includes("email") || elementName.includes("email")) {
        const email = this.personalInfo.email;
        if (email) {
          log.info(`[SMART MATCH] \u2705 Email field detected: ${email}`);
          return { fieldType: "email", value: email, matchedBy: "element-id" };
        }
      }
      return null;
    } catch (error) {
      log.debug(`[SMART MATCH] Error: ${error}`);
      return null;
    }
  }
  /**
   * Match a field by analyzing the question text
   * 
   * Fallback when HTML structure doesn't help.
   * Detects URLs, phone numbers, city, etc. by keywords.
   */
  matchByQuestionText(questionText) {
    if (!this.personalInfo) return null;
    const questionLower = questionText.toLowerCase();
    if (this.isUrlField(questionLower)) {
      const url = this.getUrlForQuestion(questionLower);
      if (url) {
        return { fieldType: "url", value: url, matchedBy: "question-text" };
      }
    }
    if (questionLower.includes("phone") && !questionLower.includes("prefix")) {
      const phone = this.formatPhone();
      if (phone) {
        log.info(`[SMART MATCH] \u2705 Phone (by question): ${phone}`);
        return { fieldType: "phone", value: phone, matchedBy: "question-text" };
      }
    }
    if (questionLower.includes("city") || questionLower.includes("location")) {
      const city = this.personalInfo.city;
      if (city) {
        log.info(`[SMART MATCH] \u2705 City (by question): ${city}`);
        return { fieldType: "city", value: city, matchedBy: "question-text" };
      }
    }
    return null;
  }
  /**
   * Match a school/university from dropdown options
   * 
   * Uses resume education data to find matching institution
   */
  matchSchool(options) {
    if (!this.educationDetails || this.educationDetails.length === 0) {
      return null;
    }
    log.debug("[SMART MATCH] Attempting school match");
    const alternativeNames = {
      "universit\xE9 psl": ["Paris Sciences et Lettres", "PSL University", "PSL Research University"],
      "psl": ["Paris Sciences et Lettres", "PSL University"],
      "institut polytechnique de paris": ["IP Paris", "Polytechnique Paris"],
      "telecom sudparis": ["T\xE9l\xE9com SudParis", "Telecom SudParis", "TSP"],
      "telecom paris": ["T\xE9l\xE9com Paris", "ENST"],
      "ecole polytechnique": ["Polytechnique", "X"],
      "hec paris": ["HEC", "HEC School of Management"],
      "sciences po": ["Sciences Po Paris", "Institut d'\xC9tudes Politiques"],
      "ens": ["\xC9cole Normale Sup\xE9rieure", "ENS Paris", "Normale Sup"],
      "centrale": ["CentraleSup\xE9lec", "\xC9cole Centrale"],
      "mines": ["MINES ParisTech", "\xC9cole des Mines"],
      "sainte-genevi\xE8ve": ["Ginette", "Sainte Genevi\xE8ve"]
    };
    for (const edu of this.educationDetails) {
      const institution = edu.university;
      if (!institution) continue;
      const instLower = institution.toLowerCase();
      log.debug(`[SMART MATCH] Checking: "${institution}"`);
      const exactMatch = options.find((o) => o.toLowerCase() === instLower);
      if (exactMatch) {
        log.info(`[SMART MATCH] \u2705 Exact school match: "${exactMatch}"`);
        return exactMatch;
      }
      for (const [key, alts] of Object.entries(alternativeNames)) {
        if (instLower.includes(key)) {
          for (const alt of alts) {
            const altMatch = options.find(
              (o) => o.toLowerCase().includes(alt.toLowerCase()) || alt.toLowerCase().includes(o.toLowerCase())
            );
            if (altMatch) {
              log.info(`[SMART MATCH] \u2705 Alternative name match: "${altMatch}"`);
              return altMatch;
            }
          }
        }
      }
      const partialMatch = options.find(
        (o) => o.toLowerCase().includes(instLower) || instLower.includes(o.toLowerCase())
      );
      if (partialMatch) {
        log.info(`[SMART MATCH] \u2705 Partial school match: "${partialMatch}"`);
        return partialMatch;
      }
      const skipWords = ["university", "institut", "\xE9cole", "ecole", "paris", "france", "college"];
      const institutionWords = instLower.split(/[\s\-()]+/).filter(
        (w) => w.length > 4 && !skipWords.includes(w)
      );
      for (const word of institutionWords) {
        const wordMatch = options.find((o) => o.toLowerCase().includes(word));
        if (wordMatch) {
          log.info(`[SMART MATCH] \u2705 Word-based school match: "${wordMatch}" (word: "${word}")`);
          return wordMatch;
        }
      }
    }
    log.warn("[SMART MATCH] No school match found");
    return null;
  }
  /**
   * Match phone prefix from dropdown options
   */
  matchPhonePrefix(options) {
    const phonePrefix = this.personalInfo?.phonePrefix;
    if (phonePrefix) {
      const match = options.find((o) => o.includes(phonePrefix));
      if (match) {
        log.info(`[SMART MATCH] \u2705 Phone prefix match: "${match}"`);
        return match;
      }
    }
    const commonPrefixes = ["+1", "+44", "+33", "+49", "+39", "+34"];
    for (const prefix of commonPrefixes) {
      const match = options.find((o) => o.includes(prefix));
      if (match) {
        log.debug(`[SMART MATCH] Using common prefix: "${match}"`);
        return match;
      }
    }
    return null;
  }
  /**
   * Check if a question is asking for a URL field
   */
  isUrlField(questionLower) {
    return questionLower.includes("website") || questionLower.includes("url") || questionLower.includes("portfolio") || questionLower.includes("personal site") || questionLower.includes("github") || questionLower.includes("linkedin");
  }
  /**
   * Get appropriate URL based on question context
   */
  getUrlForQuestion(questionLower) {
    if (!this.personalInfo) return null;
    if (questionLower.includes("github") && this.personalInfo.github) {
      log.info(`[SMART MATCH] \u2705 GitHub URL: ${this.personalInfo.github}`);
      return this.personalInfo.github;
    }
    if (questionLower.includes("linkedin") && this.personalInfo.linkedin) {
      log.info(`[SMART MATCH] \u2705 LinkedIn URL: ${this.personalInfo.linkedin}`);
      return this.personalInfo.linkedin;
    }
    if (this.personalInfo.github) {
      log.info(`[SMART MATCH] \u2705 Website (GitHub): ${this.personalInfo.github}`);
      return this.personalInfo.github;
    }
    if (this.personalInfo.linkedin) {
      log.info(`[SMART MATCH] \u2705 Website (LinkedIn): ${this.personalInfo.linkedin}`);
      return this.personalInfo.linkedin;
    }
    return null;
  }
  /**
   * Format phone number with prefix
   */
  formatPhone() {
    if (!this.personalInfo?.phone) return null;
    return this.personalInfo.phonePrefix ? `${this.personalInfo.phonePrefix}${this.personalInfo.phone}` : this.personalInfo.phone;
  }
}
export {
  SmartFieldMatcher
};
//# sourceMappingURL=smart-field-matcher.js.map
