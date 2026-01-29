const personalInformationTemplate = `
Answer the following question based on the provided personal information and experience.

## Rules
- Answer questions directly.
- For professional title/headline questions: Derive a concise professional title from the person's most recent or relevant work experience (e.g., "Senior Software Engineer", "Data Scientist", "Product Manager"). DO NOT use the person's name.
- **For "Tell us about yourself" or "Introduce yourself" questions**: Provide a 2-3 sentence professional summary focusing on:
  1. Current/most recent role and years of experience
  2. Key technical skills and areas of expertise
  3. Notable achievements or strengths
  - DO NOT use cover letter format with addresses and "Dear Hiring Manager"
  - DO NOT include date of birth, contact details, or personal biographical information
  - Keep it conversational but professional
- Use the provided pronouns consistently in all responses.
- Do NOT include date of birth, phone numbers, email addresses, or full addresses in professional summaries or headlines unless explicitly asked.
- Professional summaries should focus on skills, experience, and career highlights - not biographical details.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: John Doe, born on 01/01/1990, living in Milan, Italy.
Question: What is your city?
Milan

My resume: Senior Backend Engineer with 5 years experience at TechCorp
Question: Tell us about yourself
I'm a Senior Backend Engineer with 5 years of experience specializing in Python and microservices architecture. I've built scalable systems handling millions of daily users and have a strong track record of optimizing performance and mentoring junior developers.

Personal Information: {resume_section}
Pronouns: {pronouns}
Recent Experience: {experience_summary}
Question: {question}
`;
const selfIdentificationTemplate = `
Answer the following question based on the provided self-identification details.

## Rules
- Answer questions directly.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Male, uses he/him pronouns, not a veteran, no disability.
Question: What are your gender?
Male

Self-Identification: {resume_section}
Question: {question}
`;
const legalAuthorizationTemplate = `
Answer the following question based on the provided legal authorization details.

## Rules
- Answer questions directly.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Authorized to work in the EU, no US visa required.
Question: Are you legally allowed to work in the EU?
Yes

Legal Authorization: {resume_section}
Question: {question}
`;
const workPreferencesTemplate = `
Answer the following question based on the provided work preferences.

## Rules
- Answer questions directly.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Open to remote work, willing to relocate.
Question: Are you open to remote work?
Yes

Work Preferences: {resume_section}
Question: {question}
`;
const experienceDetailsTemplate = `
Answer the following question based on the provided experience details.

## Rules
- Answer questions directly and **with specific details**.
- **Always include concrete information**: years of experience, specific technologies, frameworks, notable achievements, company names if relevant.
- If the question asks about a specific technology or skill:
  - State the exact number of years of experience (calculate from work history dates)
  - List specific tools, frameworks, or technologies used
  - Mention 1-2 concrete achievements or projects if available
- If it seems likely that you have the experience, even if not explicitly defined, answer as if you have the experience.
- **If uncertain, choose the answer most favorable to the candidate's qualifications without being dishonest.**
- If truly unsure, respond with "I have limited direct experience with that, but strong related skills in [mention similar technologies]" - always offer something positive.
- Keep the answer under 200 characters (expanded for technical detail).
- Use a confident, professional tone that showcases expertise.

## Example
My resume: 3 years as a software developer with leadership experience.
Question: Do you have leadership experience?
Yes, I have 3 years of leadership experience managing development teams and driving technical decisions.

My resume: Senior Backend Engineer (2019-2024) - Python, FastAPI, PostgreSQL, built microservices handling 1M+ requests/day.
Question: Describe your experience with Python and backend development
I have 5 years of Python backend development experience using FastAPI and Django, building scalable microservices that handle over 1 million requests daily with PostgreSQL databases.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

Experience Details: {resume_section}
Question: {question}
`;
const projectsTemplate = `
Answer the following question based on the provided project details.

## Rules
- Answer questions directly.
- If it seems likely that you have the experience, even if not explicitly defined, answer as if you have the experience.
- **If uncertain, choose the answer most favorable to the candidate's qualifications without being dishonest.**
- Keep the answer under 140 characters.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Led the development of a mobile app, repository available.
Question: Have you led any projects?
Yes, led the development of a mobile app

Projects: {resume_section}
Question: {question}
`;
const educationDetailsTemplate = `
Answer the following question based on the provided education details.

## Rules
- Answer questions directly.
- If it seems likely that you have the experience, even if not explicitly defined, answer as if you have the experience.
- **If uncertain, choose the answer most favorable to the candidate's qualifications without being dishonest.**
- If unsure, respond with "I have no experience with that, but I learn fast" or "Not yet, but willing to learn."
- Keep the answer under 140 characters.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Bachelor's degree in Computer Science with experience in Python.
Question: Do you have experience with Python?
Yes, I have experience with Python.

Education Details: {resume_section}
Question: {question}
`;
const certificationsTemplate = `
Answer the following question based on the provided certifications.

## Rules
- Answer questions directly.
- If it seems likely that you have the experience, even if not explicitly defined, answer as if you have the experience.
- **If uncertain, choose the answer most favorable to the candidate's qualifications without being dishonest.**
- If unsure, respond with "I have no experience with that, but I learn fast" or "Not yet, but willing to learn."
- Keep the answer under 140 characters.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Certified in Project Management Professional (PMP).
Question: Do you have PMP certification?
Yes, I am PMP certified.

Certifications: {resume_section}
Question: {question}
`;
const languagesTemplate = `
Answer the following question based on the provided language skills.

## Rules
- Answer questions directly.
- If it seems likely that you have the experience, even if not explicitly defined, answer as if you have the experience.
- **If uncertain, choose the answer most favorable to the candidate's qualifications without being dishonest.**
- If unsure, respond with "I have no experience with that, but I learn fast" or "Not yet, but willing to learn."
- Keep the answer under 140 characters.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Fluent in Italian and English.
Question: What languages do you speak?
Fluent in Italian and English.

Languages: {resume_section}
Question: {question}
`;
const availabilityTemplate = `
Answer the following question based on the provided availability details.

## Rules
- Answer questions directly.
- Keep the answer under 140 characters.
- Use periods only if the answer has multiple sentences.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Available to start immediately.
Question: When can you start?
I can start immediately.

Availability: {resume_section}
Question: {question}
`;
const salaryExpectationsTemplate = `
Answer the following question based on the provided salary expectations.

## Rules
- Answer questions directly.
- Keep the answer under 140 characters.
- Use periods only if the answer has multiple sentences.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Looking for a salary in the range of 50k-60k USD.
Question: What are your salary expectations?
55000.

Salary Expectations: {resume_section}
Question: {question}
`;
const interestsTemplate = `
Answer the following question based on the provided interests and professional motivation.

## Rules
- Answer questions directly and enthusiastically.
- If the interests section is empty or the question asks "why are you interested in this position", pivot to discussing relevant professional experience, skills alignment, and career growth opportunities.
- Focus on how your background makes this role a natural fit.
- Be specific and genuine - mention actual skills/technologies from your resume that relate to the opportunity.
- Never say "I don't have interests" or "Not specified" - always provide a meaningful response.
- Keep the answer under 200 characters (expanded from 140 for motivation questions).
- Use periods only if the answer has multiple sentences.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Example
My resume: Interested in AI and data science.
Question: What are your interests?
AI and data science.

My resume: [Interests empty, but experienced in Python and cloud architecture]
Question: Why are you interested in this position?
This role aligns perfectly with my 5+ years of Python and cloud architecture experience, offering an opportunity to leverage my backend development skills while growing in a challenging environment.

Interests: {resume_section}
Question: {question}
`;
export {
  availabilityTemplate,
  certificationsTemplate,
  educationDetailsTemplate,
  experienceDetailsTemplate,
  interestsTemplate,
  languagesTemplate,
  legalAuthorizationTemplate,
  personalInformationTemplate,
  projectsTemplate,
  salaryExpectationsTemplate,
  selfIdentificationTemplate,
  workPreferencesTemplate
};
//# sourceMappingURL=section-prompts.js.map
