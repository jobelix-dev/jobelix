const jobKeywordExtractionTemplate = `You are an expert at analyzing job descriptions and extracting key terminology for resume optimization.

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
const resumeScoringTemplate = `You are an expert resume evaluator. Your task is to score each item in the candidate's resume based on its relevance to the target job description.

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
const resumeKeywordOptimizationTemplate = `You are an expert resume writer specializing in keyword optimization. Your task is to adapt the resume descriptions and terminology to match the job description's language while preserving all factual information.

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
2. **Skills**: Rename or reorder skills to match exact terminology in job posting (e.g., "React" \u2192 "ReactJS" if job uses that term)
3. **Terminology**: Replace generic terms with specific ones from job description (e.g., "built" \u2192 "architected" if job emphasizes architecture)
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
const resumeTailoringTemplate = `You are an expert resume writer and job application specialist. Your task is to tailor a resume configuration to a specific job description while maintaining the exact same YAML structure and field names.

## Critical Rules
- **MAINTAIN the exact same YAML structure and field names**.
- **DO NOT remove or empty any sections**; all fields must remain intact.
- **DO NOT change the overall format or organization**; the structure must be preserved.
- **ONLY modify the content within existing fields** to better match the job description.
- **ONLY delete irrelevant projects** based on the job description (do not remove those that are related to the job).
- **Keep all technical details accurate** \u2014 do not fabricate or make up experience or skills.
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
export {
  jobKeywordExtractionTemplate,
  resumeKeywordOptimizationTemplate,
  resumeScoringTemplate,
  resumeTailoringTemplate
};
//# sourceMappingURL=tailoring-prompts.js.map
