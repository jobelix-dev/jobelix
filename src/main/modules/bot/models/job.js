function createJob(title, company, location, link, applyMethod) {
  return {
    title,
    company,
    location,
    link,
    applyMethod
  };
}
function setJobDescription(job, description) {
  return {
    ...job,
    description
  };
}
function setSummarizedDescription(job, summary) {
  return {
    ...job,
    summarizedDescription: summary
  };
}
function isBlacklisted(job, companyBlacklist, titleBlacklist, seenJobs) {
  if (seenJobs.has(job.link)) {
    return true;
  }
  const companyLower = job.company.trim().toLowerCase();
  if (companyBlacklist.some((c) => c.trim().toLowerCase() === companyLower)) {
    return true;
  }
  const titleWords = job.title.toLowerCase().split(/\s+/);
  if (titleBlacklist.some((word) => titleWords.includes(word.toLowerCase()))) {
    return true;
  }
  return false;
}
export {
  createJob,
  isBlacklisted,
  setJobDescription,
  setSummarizedDescription
};
//# sourceMappingURL=job.js.map
