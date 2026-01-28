import * as fs from "fs";
import * as yaml from "js-yaml";
import { createLogger } from "../utils/logger.js";
const log = createLogger("ConfigValidator");
class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}
function loadAndValidateConfig(configPath) {
  log.info(`Loading config from: ${configPath}`);
  if (!fs.existsSync(configPath)) {
    throw new ConfigError(`Config file not found: ${configPath}`);
  }
  const content = fs.readFileSync(configPath, "utf-8");
  let data;
  try {
    data = yaml.load(content);
  } catch (e) {
    throw new ConfigError(`Error parsing config YAML: ${e}`);
  }
  return validateConfig(data);
}
function validateConfig(data) {
  if (typeof data.remote !== "boolean") {
    throw new ConfigError("'remote' must be a boolean value");
  }
  const experienceLevel = validateExperienceLevel(data.experienceLevel);
  const jobTypes = validateJobTypes(data.jobTypes);
  const dateFilter = validateDateFilter(data.date);
  const positions = validateStringArray(data.positions, "positions");
  const locations = validateStringArray(data.locations, "locations");
  const distance = validateDistance(data.distance);
  const companyBlacklist = sanitizeStringArray(data.companyBlacklist);
  const titleBlacklist = sanitizeStringArray(data.titleBlacklist);
  const config = {
    remote: data.remote,
    experienceLevel,
    jobTypes,
    date: dateFilter,
    positions,
    locations,
    distance,
    companyBlacklist,
    titleBlacklist
  };
  log.info(`Config validated: ${positions.length} positions, ${locations.length} locations`);
  return config;
}
function validateExperienceLevel(data) {
  const levels = data || {};
  const validLevels = ["internship", "entry", "associate", "mid-senior level", "director", "executive"];
  const result = {
    internship: false,
    entry: false,
    associate: false,
    "mid-senior level": false,
    director: false,
    executive: false
  };
  for (const level of validLevels) {
    if (typeof levels[level] !== "boolean") {
      throw new ConfigError(`Experience level '${level}' must be a boolean value`);
    }
    result[level] = levels[level];
  }
  return result;
}
function validateJobTypes(data) {
  const types = data || {};
  const validTypes = ["full-time", "contract", "part-time", "temporary", "internship", "other", "volunteer"];
  const result = {
    "full-time": false,
    contract: false,
    "part-time": false,
    temporary: false,
    internship: false,
    other: false,
    volunteer: false
  };
  for (const jobType of validTypes) {
    if (typeof types[jobType] !== "boolean") {
      throw new ConfigError(`Job type '${jobType}' must be a boolean value`);
    }
    result[jobType] = types[jobType];
  }
  return result;
}
function validateDateFilter(data) {
  const dates = data || {};
  const validDates = ["all time", "month", "week", "24 hours"];
  const result = {
    "all time": false,
    month: false,
    week: false,
    "24 hours": false
  };
  for (const dateFilter of validDates) {
    if (typeof dates[dateFilter] !== "boolean") {
      throw new ConfigError(`Date filter '${dateFilter}' must be a boolean value`);
    }
    result[dateFilter] = dates[dateFilter];
  }
  return result;
}
function validateStringArray(data, name) {
  if (!Array.isArray(data)) {
    throw new ConfigError(`'${name}' must be an array`);
  }
  for (const item of data) {
    if (typeof item !== "string") {
      throw new ConfigError(`'${name}' must contain only strings`);
    }
  }
  return data;
}
function sanitizeStringArray(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((item) => typeof item === "string");
}
function validateDistance(data) {
  const approvedDistances = /* @__PURE__ */ new Set([0, 5, 10, 25, 50, 100]);
  if (typeof data !== "number" || !approvedDistances.has(data)) {
    throw new ConfigError(`Invalid distance value. Must be one of: ${[...approvedDistances].join(", ")}`);
  }
  return data;
}
function buildSearchUrl(config) {
  const parts = [];
  if (config.remote) {
    parts.push("f_CF=f_WRA");
  }
  const expLevelMap = {
    internship: 1,
    entry: 2,
    associate: 3,
    "mid-senior level": 4,
    director: 5,
    executive: 6
  };
  const selectedLevels = Object.entries(config.experienceLevel).filter(([_, enabled]) => enabled).map(([level]) => expLevelMap[level]);
  if (selectedLevels.length > 0) {
    parts.push(`f_E=${selectedLevels.join(",")}`);
  }
  parts.push(`distance=${config.distance}`);
  const jobTypeMap = {
    "full-time": "F",
    contract: "C",
    "part-time": "P",
    temporary: "T",
    internship: "I",
    other: "O",
    volunteer: "V"
  };
  const selectedTypes = Object.entries(config.jobTypes).filter(([_, enabled]) => enabled).map(([type]) => jobTypeMap[type]);
  if (selectedTypes.length > 0) {
    parts.push(`f_JT=${selectedTypes.join(",")}`);
  }
  const dateMap = {
    "all time": "",
    month: "&f_TPR=r2592000",
    week: "&f_TPR=r604800",
    "24 hours": "&f_TPR=r86400"
  };
  const selectedDate = Object.entries(config.date).find(([_, enabled]) => enabled);
  const dateParam = selectedDate ? dateMap[selectedDate[0]] : "";
  parts.push("f_LF=f_AL");
  return `?${parts.join("&")}${dateParam}`;
}
export {
  ConfigError,
  buildSearchUrl,
  loadAndValidateConfig,
  validateConfig
};
//# sourceMappingURL=config-validator.js.map
