# Quick Reference: New Bot Features

## Resume Scoring

```typescript
import { GPTAnswerer } from './ai/gpt-answerer';
import { ResumeSectionScorer } from './models/resume-scorer';

// Score resume
const gpt = new GPTAnswerer(token, apiUrl);
const scoresJson = await gpt.scoreResumeForJob(jobDescription, resumeYaml);

// Parse and select items
const scorer = new ResumeSectionScorer(resumeYaml, jobDescription);
scorer.parseScoresJson(scoresJson);
scorer.convertToScoredItems(scorer.scoresDict!);

const { items, metrics } = scorer.filterTopItems({
  minScore: 40,
  minItems: 10,
  maxItems: 15,
});

const skills = scorer.getTopSkills(20);
```

## Resume Generation

```typescript
import { generateTailoredResume } from './models/resume-generator';

const result = await generateTailoredResume({
  companyName: job.company,
  jobTitle: job.title,
  tailoredConfigYaml: filteredYaml,
  scoresJson: scoresJson,
  page: playwrightPage, // For PDF generation
});

console.log(`Resume: ${result.pdfPath}`);
```

## Backend Client

```typescript
import { BackendAPIClient } from './ai/backend-client';

const client = new BackendAPIClient({
  token: 'your-token',
  apiUrl: 'https://api.example.com/gpt4',
});

const response = await client.chatCompletion(
  [{ role: 'user', content: 'Question' }],
  'gpt-4o-mini',
  0.8
);
```

## LLM Logging

```typescript
import { llmLogger } from './utils/llm-logger';

// Automatic logging (done by BackendAPIClient)
// Just call this to see stats:
llmLogger.printUsageSummary();

// Or get data:
const usage = llmLogger.getTotalUsage();
console.log(`Cost: $${usage.totalCost}`);
```

## File Locations

- Resume scores: `data_folder/tailored_resumes/{company}_{title}_{timestamp}_scores.json`
- Resume YAML: `data_folder/tailored_resumes/{company}_{title}_{timestamp}.yaml`
- Resume PDF: `data_folder/tailored_resumes/{company}_{title}_{timestamp}.pdf`
- API logs: `data_folder/output/backend_api_calls.json`
- LLM logs: `data_folder/output/llm_calls.json`
