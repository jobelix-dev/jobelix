/**
 * Prompt Templates for GPT Answerer
 * 
 * Contains all prompt templates for different types of questions.
 * EXACTLY MATCHES the Python templates.py file.
 */

// Numeric question template (MATCHES PYTHON)
export const numericQuestionTemplate = `The following is a resume and an answered question about the resume, being answered by the person who's resume it is (first person).

## Rules
- Answer the question with a number only (no text, no explanations).
- Regarding work experience, evaluate based on job titles, responsibilities, and technologies mentioned in work history.
- Regarding experience in general, consider all of work experience, educational background, courses and projects.
- If it seems possible that you have the experience based on the resume, even if not explicitly stated on the resume, answer as if you have strong experience.
- For questions about years of experience, answer with a whole number (e.g., 3, 5, 10).
- **Round up experience estimates within reason** (e.g., 2.5 years → 3 years, 4.8 years → 5 years) to position candidate favorably.
- For questions about proficiency levels or ratings, use numbers 1-10 where 1 is beginner and 10 is expert.
- **For proficiency, default to 7-8/10 if evidence of competency exists** (projects, coursework, or related experience).
- If uncertain, choose the answer most favorable to the candidate's qualifications without being dishonest.
- If you really are not sure, as last resort use default value: {default_experience}.

## Example
My resume: I'm a software engineer with 10 years of experience on both swift and python.
Question: how much years experience with swift?
10

My resume: I'm a software engineer with 10 years of experience on both swift and python.
Question: how much years experience with Java?
0

-----

## My resume:
\`\`\`
{resume}
\`\`\`
        
## Question:
{question}

## `;

// Personal Information Template (MATCHES PYTHON)
export const personalInformationTemplate = `
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

// Self Identification Template (MATCHES PYTHON)
export const selfIdentificationTemplate = `
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

// Legal Authorization Template (MATCHES PYTHON)
export const legalAuthorizationTemplate = `
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

// Work Preferences Template (MATCHES PYTHON)
export const workPreferencesTemplate = `
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

// Education Details Template (MATCHES PYTHON)
export const educationDetailsTemplate = `
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

// Experience Details Template (MATCHES PYTHON)
export const experienceDetailsTemplate = `
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

// Projects Template (MATCHES PYTHON)
export const projectsTemplate = `
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

// Availability Template (MATCHES PYTHON)
export const availabilityTemplate = `
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

// Salary Expectations Template (MATCHES PYTHON)
export const salaryExpectationsTemplate = `
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

// Certifications Template (MATCHES PYTHON)
export const certificationsTemplate = `
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

// Languages Template (MATCHES PYTHON)
export const languagesTemplate = `
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

// Interests Template (MATCHES PYTHON)
export const interestsTemplate = `
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

// Cover Letter Template (MATCHES PYTHON)
export const coverLetterTemplate = `You are a professional career advisor and expert cover letter writer. Write a compelling, personalized cover letter based on the candidate's resume and the job description.

## Rules
- Write in first person from the candidate's perspective
- Be professional yet personable and authentic
- Highlight the most relevant skills and experiences from the resume that match the job requirements
- Show enthusiasm for the role and company
- Keep it concise (250-400 words)
- **DO NOT use any placeholders** like [Company Name], [Hiring Manager's Name], [Your Name], [Date], [Address], etc.
- **DO NOT include header formatting** with addresses, dates, or "Dear [Name]" salutations
- Start directly with the cover letter body content
- If company name is unknown, refer to "your company" or "your team" naturally in sentences
- Include a strong opening that captures attention
- Demonstrate knowledge of the role and how you're a good fit
- End with a clear call to action
- DO NOT fabricate any experiences or skills not mentioned in the resume
- DO NOT use overly generic phrases or clichés

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## Structure
1. Opening: Brief introduction and statement of interest (no salutation, start with content)
2. Body Paragraph 1: Highlight most relevant experience and skills with specific examples
3. Body Paragraph 2: Additional qualifications and value proposition
4. Closing: Express enthusiasm and request for interview

## Example Opening (CORRECT - no placeholders):
I am excited to apply for the Senior Backend Engineer position. With 5 years of experience building scalable Python microservices and a proven track record of optimizing system performance, I am confident I can contribute significantly to your engineering team.

## Example Opening (WRONG - has placeholders):
[Your Name]
[Your Address]
[Date]

Dear [Hiring Manager's Name],

I am excited to apply for the position at [Company Name]...

---

## Resume:
{resume}

---

## Job Description:
{job_description}

---

## Instructions:
Write a professional cover letter that effectively presents this candidate for the role. Return ONLY the cover letter body text - NO addresses, NO "Dear [Name]", NO placeholders. Start directly with the opening paragraph content.

## Cover Letter:
`;

// Options Template for Multiple Choice (MATCHES PYTHON)
export const optionsTemplate = `The following is a resume and an answered question about the resume, the answer is one of the options.

## Rules
- **If multiple options seem valid, select the one that better positions the candidate** (e.g., 'Yes' over 'Preferred but not required').
- If uncertain or question could be interpreted multiple ways, choose the answer most favorable to the candidate's qualifications without being dishonest.
- Never choose the default/placeholder option, examples are: 'Select an option', 'None', 'Choose from the options below', etc.
- The answer must be one of the options.
- The answer must exclusively contain one of the options.

## Example
My resume: I'm a software engineer with 10 years of experience on swift, python, C, C++.
Question: How many years of experience do you have on python?
Options: [1-2, 3-5, 6-10, 10+]
10+

-----

## My resume:
\`\`\`
{resume}
\`\`\`

## Question:
{question}

## Options:
{options}

## `;

// Resume Tailoring Template (MATCHES PYTHON)
export const resumeTailoringTemplate = `You are an expert resume writer and job application specialist. Your task is to tailor a resume configuration to a specific job description while maintaining the exact same YAML structure and field names.

## Critical Rules
- **MAINTAIN the exact same YAML structure and field names**.
- **DO NOT remove or empty any sections**; all fields must remain intact.
- **DO NOT change the overall format or organization**; the structure must be preserved.
- **ONLY modify the content within existing fields** to better match the job description.
- **ONLY delete irrelevant projects** based on the job description (do not remove those that are related to the job).
- **Keep all technical details accurate** — do not fabricate or make up experience or skills.
- **Preserve all dates, company names, and factual information**.
- Focus on **emphasizing relevant skills** and **rephrasing descriptions** where needed to align with the job description.
- When tailoring, ensure your focus is on keywords, key phrases, and job-specific terminology that are found in the job description.

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.


## What to Tailor:
1. **Project Descriptions**:
   - Reword project descriptions to highlight aspects relevant to the job.
   - **Remove projects** that are clearly **unrelated** to the job.
   
2. **Skills Keywords**:
   - **Emphasize or reorder skills** based on the keywords in the job description.
   - Add any **skills or technologies** mentioned in the job description that are missing from the resume.

3. **Work Experience**:
   - **Rephrase responsibilities** and achievements in previous roles to match the job requirements.
   - Ensure job titles, duties, and accomplishments are framed to reflect the job description's focus.

4. **Summary/Objective**:
   - Adjust the **Summary** or **Objective** section to reflect the specific focus of the role and the job's primary responsibilities.
   - Tailor this section to highlight your **most relevant skills and experiences** for the position.

5. **Technical Skills**:
   - **Reorder** or **rename** technologies to better match the job description.
   - **Add any missing technical skills** that are specifically mentioned in the job description (if they are within your experience).

## What NOT to Change:
- **Dates of employment or education**.
- **Company names** (keep as-is).
- **Degree titles** and **institution names**.
- **Basic personal information** (name, contact details).
- **Overall YAML structure and indentation**.
- **Field names or keys** in the YAML.

## Instructions:
Analyze the job description provided below and tailor the base resume configuration to best match the role. Be mindful of the above rules. 

Return **only** the tailored YAML configuration in the format below, **without any markdown code blocks or additional text**. Start directly with the YAML content.

---

## Job Description:
{job_description}

---

## Base Resume Configuration:
\`\`\`yaml
{base_config}
\`\`\`

---

## Instructions:
Return ONLY the tailored YAML configuration. Do NOT include any markdown code blocks, explanations, or additional text. Start your response directly with the YAML content.

## Tailored Resume Configuration:
`;

// Keyword Extraction Template (Stage 1: Extract key terms from job description)
export const jobKeywordExtractionTemplate = `You are an expert at analyzing job descriptions and extracting key terminology for resume optimization.

## Task
Analyze the job description and extract 20-30 key terms across multiple categories. These keywords will be used to optimize a resume for ATS (Applicant Tracking System) compatibility.

## Rules
- Extract ACTUAL keywords from the job description - do not invent terms
- Include both explicit terms (directly stated) and implicit terms (strongly implied)
- Keep all terms, including generic ones ("team player", "fast learner") - ATS systems often scan for these
- Deduplicate similar terms (keep the most specific version)
- Limit to 20-30 keywords total across all categories

## Categories
1. **technical_skills**: Programming languages, frameworks, tools, platforms (e.g., "Python", "React", "AWS", "Docker")
2. **soft_skills**: Interpersonal and professional skills (e.g., "leadership", "communication", "problem-solving")
3. **domain_terms**: Industry-specific terminology and concepts (e.g., "machine learning", "microservices", "agile", "CI/CD")
4. **action_verbs**: Key verbs describing responsibilities (e.g., "architected", "implemented", "optimized", "led")

## Output Format
Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):

{
  "technical_skills": ["Python", "React", "AWS", "PostgreSQL"],
  "soft_skills": ["leadership", "communication", "collaboration"],
  "domain_terms": ["microservices", "CI/CD", "agile", "DevOps"],
  "action_verbs": ["architected", "implemented", "optimized", "led"]
}

---

## Job Description:
{job_description}

---

## Instructions:
Extract keywords from the job description above. Return ONLY the JSON object. No markdown code blocks, no additional text.`;

// Resume Scoring Template (Stage 2: Score all resume items by relevance)
export const resumeScoringTemplate = `You are an expert resume evaluator. Your task is to score each item in the candidate's resume based on its relevance to the target job description.

## Critical Rules
- **Score each item from 0 to 100** based on relevance to the job
- **DO NOT modify, add, or remove any content** - only provide scores
- **Preserve all original information exactly** - do not change names, dates, descriptions
- **Reference items by their array index** (e.g., work[0], projects[2], education[1])
- **Provide brief reasoning** for each score to justify your evaluation
- **If a skill appears in the job description**, give it bonus points (+15)

## Scoring Guidelines:
- **90-100**: Directly matches key job requirements, highly relevant technologies/experience
- **70-89**: Related experience, transferable skills, relevant domain knowledge
- **50-69**: Somewhat relevant, shows general competency but not specific match
- **30-49**: Tangentially related, demonstrates soft skills or foundational knowledge
- **0-29**: Minimal or no relevance to the job requirements

## Categories to Score:
1. **work** (work experience entries)
2. **projects** (personal/professional projects)
3. **education** (degrees, certifications earned through education)
4. **certificates** (standalone certifications and awards)
5. **skills** (technical and soft skills - individual scoring)

## Output Format:
Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):

Example format (replace with actual scores):
{
  "work": [
    {"index": 0, "score": 85, "reasoning": "Backend development with Python matches primary requirement"},
    {"index": 1, "score": 60, "reasoning": "Leadership experience relevant but different tech stack"}
  ],
  "projects": [
    {"index": 0, "score": 90, "reasoning": "Machine learning project directly aligns with job's AI focus"},
    {"index": 1, "score": 40, "reasoning": "Mobile app less relevant but shows full-stack capability"}
  ],
  "education": [
    {"index": 0, "score": 75, "reasoning": "Computer Science degree provides strong foundation"},
    {"index": 1, "score": 50, "reasoning": "Math minor adds analytical skills"}
  ],
  "certificates": [
    {"index": 0, "score": 80, "reasoning": "AWS certification matches cloud infrastructure requirement"}
  ],
  "skills": [
    {"index": 0, "name": "Python", "score": 95, "reasoning": "Primary language in job description (+15 bonus)"},
    {"index": 1, "name": "Java", "score": 70, "reasoning": "Backend language, transferable skills"},
    {"index": 2, "name": "Communication", "score": 55, "reasoning": "Soft skill, generally valuable"}
  ]
}

---

## Job Description:
{job_description}

---

## Resume Data (JSON Resume format):
\`\`\`yaml
{resume_yaml}
\`\`\`

---

## Instructions:
Analyze the resume and score each item. Return ONLY the JSON object above. No markdown code blocks, no additional text.`;

// Resume Keyword Optimization Template (Stage 4: Adapt descriptions to job keywords)
export const resumeKeywordOptimizationTemplate = `You are an expert resume writer specializing in keyword optimization. Your task is to adapt the resume descriptions and terminology to match the job description's language while preserving all factual information.

## Critical Rules
- **MAINTAIN the exact same YAML structure and field names**
- **DO NOT add or remove any items** - all work/projects/education/certificates must remain
- **DO NOT change dates, company names, institution names, or job titles**
- **ONLY modify descriptions and skill wording** to match job terminology
- **NATURALLY INTEGRATE TARGET KEYWORDS** from the list below into descriptions where truthful and relevant
- **Keep all technical details accurate** - do not fabricate experience or skills
- **Preserve all factual information** - only rephrase for keyword alignment

## Language Rule
- Always answer in the same language as the question.
- Do not translate unless required to match the question language.
- If the language is unclear or mixed, default to English.

## What to Optimize:
1. **Descriptions**: Reword highlights/summaries to emphasize job-relevant aspects using keywords from job description
2. **Skills**: Rename or reorder skills to match exact terminology in job posting (e.g., "React" → "ReactJS" if job uses that term)
3. **Terminology**: Replace generic terms with specific ones from job description (e.g., "built" → "architected" if job emphasizes architecture)
4. **Emphasis**: Reorder bullet points to highlight most relevant responsibilities first

## What NOT to Change:
- **Dates** of employment, education, or project timelines
- **Names** of companies, institutions, or certificate issuers
- **Titles** of positions, degrees, or certifications
- **Core facts** about what was actually done or achieved
- **YAML structure** or field organization

## Instructions:
Analyze the job description and optimize the resume for keyword matching. Focus on adapting language without changing substance. Where possible and truthful, naturally integrate the target keywords below into work/project/education descriptions.

Return **only** the optimized YAML configuration. Do NOT include markdown code blocks, explanations, or additional text. Start directly with the YAML content.

---

## Target Keywords (integrate naturally where relevant):
{extracted_keywords}

---

## Job Description:
{job_description}

---

## Filtered Resume Configuration (already relevance-filtered):
\`\`\`yaml
{filtered_config}
\`\`\`

---

## Optimized Resume Configuration:
`;
