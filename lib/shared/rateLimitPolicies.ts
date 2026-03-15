export interface ApiRateLimitPolicy {
  endpoint: string;
  hourlyLimit: number;
  dailyLimit: number;
}

export interface ProxySingleWindowPolicy {
  limit: number;
  windowMs: number;
}

export interface ProxyDualWindowPolicy {
  hourlyLimit: number;
  dailyLimit: number;
}

export const API_RATE_LIMIT_POLICIES = {
  gpt4: {
    endpoint: 'gpt4',
    hourlyLimit: 100,
    dailyLimit: 500,
  },
  resumeUpload: {
    endpoint: 'resume-upload',
    hourlyLimit: 10,
    dailyLimit: 20,
  },
  resumeExtraction: {
    endpoint: 'resume-extraction',
    hourlyLimit: 10,
    dailyLimit: 20,
  },
  githubImport: {
    endpoint: 'github-import',
    hourlyLimit: 5,
    dailyLimit: 10,
  },
  newsletterSubscribe: {
    endpoint: 'newsletter-subscribe',
    hourlyLimit: 5,
    dailyLimit: 20,
  },
  feedbackSubmit: {
    endpoint: 'feedback-submit',
    hourlyLimit: 10,
    dailyLimit: 50,
  },
  workPreferences: {
    endpoint: 'work-preferences',
    hourlyLimit: 20,
    dailyLimit: 100,
  },
  workPreferencesExportYaml: {
    endpoint: 'work-preferences-export-yaml',
    hourlyLimit: 10,
    dailyLimit: 30,
  },
  creditsClaim: {
    endpoint: 'credits-claim',
    hourlyLimit: 10,
    dailyLimit: 50,
  },
  referralApply: {
    endpoint: 'referral-apply',
    hourlyLimit: 5,
    dailyLimit: 20,
  },
  newsletterUnsubscribe: {
    endpoint: 'newsletter-unsubscribe',
    hourlyLimit: 10,
    dailyLimit: 20,
  },
} as const satisfies Record<string, ApiRateLimitPolicy>;

export const PROXY_RATE_LIMIT_POLICIES = {
  general: {
    limit: 200,
    windowMs: 60 * 1000,
  },
  resumeUpload: {
    limit: 20,
    windowMs: 24 * 60 * 60 * 1000,
  },
  resumeExtract: {
    limit: 20,
    windowMs: 24 * 60 * 60 * 1000,
  },
  authAttempts: {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  },
  newsletter: {
    hourlyLimit: 5,
    dailyLimit: 20,
  },
  feedback: {
    hourlyLimit: 10,
    dailyLimit: 50,
  },
} as const satisfies Record<string, ProxySingleWindowPolicy | ProxyDualWindowPolicy>;
