/**
 * Form Question Prompt Templates
 * 
 * Templates for answering specific types of form questions:
 * - Numeric questions (years of experience, ratings)
 * - Multiple choice questions (dropdown, radio options)
 * - Cover letter generation
 */

// ============================================================================
// NUMERIC QUESTIONS
// ============================================================================

/** Numeric Question - Years of experience, proficiency ratings */
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

// ============================================================================
// MULTIPLE CHOICE QUESTIONS
// ============================================================================

/** Options Template - Dropdown and radio button questions */
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

// ============================================================================
// COVER LETTER
// ============================================================================

/** Cover Letter - Full cover letter generation */
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
- **You MUST write the cover letter in {target_language}.**
- Translate the content to {target_language} if the resume data is in a different language.
- All output text must be in {target_language}, regardless of the job description's language.

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
