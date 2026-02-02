import * as fs from "fs";
import * as path from "path";
import { createLogger } from "../utils/logger.js";
import { getDataFolderPath } from "../utils/paths.js";
const log = createLogger("LLMLogger");
const MODEL_PRICING = {
  "gpt-4o-mini": {
    input: 15e-8,
    // $0.15 per 1M tokens
    output: 6e-7
    // $0.60 per 1M tokens
  },
  "gpt-4o": {
    input: 5e-6,
    // $5.00 per 1M tokens
    output: 15e-6
    // $15.00 per 1M tokens
  },
  "gpt-4": {
    input: 3e-5,
    // $30.00 per 1M tokens
    output: 6e-5
    // $60.00 per 1M tokens
  },
  "gpt-3.5-turbo": {
    input: 5e-7,
    // $0.50 per 1M tokens
    output: 15e-7
    // $1.50 per 1M tokens
  }
};
class LLMLogger {
  constructor(logFileName = "llm_calls.json") {
    const dataFolder = getDataFolderPath();
    const outputFolder = path.join(dataFolder, "output");
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }
    this.logFilePath = path.join(outputFolder, logFileName);
    log.debug(`LLM logger initialized: ${this.logFilePath}`);
  }
  /**
   * Log an API request
   */
  logRequest(messages, response, usage, model, finishReason = "stop") {
    const currentTime = (/* @__PURE__ */ new Date()).toISOString();
    const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o-mini"];
    const totalCost = usage.input_tokens * pricing.input + usage.output_tokens * pricing.output;
    log.debug(
      `Model: ${model}, Tokens: ${usage.total_tokens} (in:${usage.input_tokens}, out:${usage.output_tokens})`
    );
    const logEntry = {
      model,
      time: currentTime,
      messages,
      response,
      total_tokens: usage.total_tokens,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_cost: totalCost,
      finish_reason: finishReason
    };
    try {
      const logLine = JSON.stringify(logEntry, null, 2) + "\n";
      fs.appendFileSync(this.logFilePath, logLine, "utf-8");
      log.debug(`Call logged to ${this.logFilePath}`);
    } catch (error) {
      log.warn(`Failed to write to ${this.logFilePath}: ${error}`);
    }
  }
  /**
   * Calculate total usage and cost from log file
   */
  getTotalUsage() {
    if (!fs.existsSync(this.logFilePath)) {
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        byModel: {}
      };
    }
    try {
      const content = fs.readFileSync(this.logFilePath, "utf-8");
      const lines = content.trim().split("\n").filter((line) => line.trim());
      let totalCalls = 0;
      let totalTokens = 0;
      let totalCost = 0;
      const byModel = {};
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          totalCalls++;
          totalTokens += entry.total_tokens;
          totalCost += entry.total_cost;
          if (!byModel[entry.model]) {
            byModel[entry.model] = { calls: 0, tokens: 0, cost: 0 };
          }
          byModel[entry.model].calls++;
          byModel[entry.model].tokens += entry.total_tokens;
          byModel[entry.model].cost += entry.total_cost;
        } catch (_parseError) {
          log.debug(`Skipping malformed log line: ${line.substring(0, 50)}...`);
        }
      }
      return { totalCalls, totalTokens, totalCost, byModel };
    } catch (error) {
      log.error(`Error reading log file: ${error}`);
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        byModel: {}
      };
    }
  }
  /**
   * Print usage summary
   */
  printUsageSummary() {
    const usage = this.getTotalUsage();
    log.info("========== LLM USAGE SUMMARY ==========");
    log.info(`Total calls: ${usage.totalCalls}`);
    log.info(`Total tokens: ${usage.totalTokens.toLocaleString()}`);
    log.info("");
    log.info("By model:");
    for (const [model, stats] of Object.entries(usage.byModel)) {
      log.info(
        `  ${model}: ${stats.calls} calls, ${stats.tokens.toLocaleString()} tokens`
      );
    }
    log.info("=======================================");
  }
  /**
   * Clear log file
   */
  clearLogs() {
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.unlinkSync(this.logFilePath);
        log.info(`Cleared log file: ${this.logFilePath}`);
      }
    } catch (error) {
      log.error(`Failed to clear logs: ${error}`);
    }
  }
}
const llmLogger = new LLMLogger();
export {
  LLMLogger,
  llmLogger
};
//# sourceMappingURL=llm-logger.js.map
