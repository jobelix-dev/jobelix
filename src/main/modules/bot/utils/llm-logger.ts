/**
 * LLM Logger - API Call Logging and Cost Tracking
 * 
 * Logs all LLM API calls with usage metrics and costs.
 * Port of Python's src/ai/llm_logger.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { getDataFolderPath } from '../utils/paths';
import type { ChatMessage, TokenUsage } from './backend-client';

const log = createLogger('LLMLogger');

/**
 * Pricing configuration for different models
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': {
    input: 0.00000015,  // $0.15 per 1M tokens
    output: 0.0000006,  // $0.60 per 1M tokens
  },
  'gpt-4o': {
    input: 0.000005,    // $5.00 per 1M tokens
    output: 0.000015,   // $15.00 per 1M tokens
  },
  'gpt-4': {
    input: 0.00003,     // $30.00 per 1M tokens
    output: 0.00006,    // $60.00 per 1M tokens
  },
  'gpt-3.5-turbo': {
    input: 0.0000005,   // $0.50 per 1M tokens
    output: 0.0000015,  // $1.50 per 1M tokens
  },
};

/**
 * Log entry structure
 */
export interface LLMLogEntry {
  model: string;
  time: string;
  messages: ChatMessage[];
  response: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  finish_reason: string;
}

/**
 * Logger for LLM API calls with cost tracking
 */
export class LLMLogger {
  private logFilePath: string;

  constructor(logFileName: string = 'llm_calls.json') {
    const dataFolder = getDataFolderPath();
    const outputFolder = path.join(dataFolder, 'output');

    // Ensure output folder exists
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    this.logFilePath = path.join(outputFolder, logFileName);
    log.debug(`LLM logger initialized: ${this.logFilePath}`);
  }

  /**
   * Log an API request
   */
  logRequest(
    messages: ChatMessage[],
    response: string,
    usage: TokenUsage,
    model: string,
    finishReason: string = 'stop'
  ): void {
    const currentTime = new Date().toISOString();

    // Calculate cost
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
    const totalCost =
      usage.input_tokens * pricing.input +
      usage.output_tokens * pricing.output;

    // Log to console
    log.debug(
      `Model: ${model}, Tokens: ${usage.total_tokens} ` +
      `(in:${usage.input_tokens}, out:${usage.output_tokens}), ` +
      `Cost: $${totalCost.toFixed(6)}`
    );

    // Create log entry
    const logEntry: LLMLogEntry = {
      model,
      time: currentTime,
      messages,
      response,
      total_tokens: usage.total_tokens,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_cost: totalCost,
      finish_reason: finishReason,
    };

    // Append to log file
    try {
      const logLine = JSON.stringify(logEntry, null, 2) + '\n';
      fs.appendFileSync(this.logFilePath, logLine, 'utf-8');
      log.debug(`Call logged to ${this.logFilePath}`);
    } catch (error) {
      log.warn(`Failed to write to ${this.logFilePath}: ${error}`);
    }
  }

  /**
   * Calculate total usage and cost from log file
   */
  getTotalUsage(): {
    totalCalls: number;
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, { calls: number; tokens: number; cost: number }>;
  } {
    if (!fs.existsSync(this.logFilePath)) {
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        byModel: {},
      };
    }

    try {
      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      let totalCalls = 0;
      let totalTokens = 0;
      let totalCost = 0;
      const byModel: Record<string, { calls: number; tokens: number; cost: number }> = {};

      for (const line of lines) {
        try {
          const entry: LLMLogEntry = JSON.parse(line);
          
          totalCalls++;
          totalTokens += entry.total_tokens;
          totalCost += entry.total_cost;

          if (!byModel[entry.model]) {
            byModel[entry.model] = { calls: 0, tokens: 0, cost: 0 };
          }
          byModel[entry.model].calls++;
          byModel[entry.model].tokens += entry.total_tokens;
          byModel[entry.model].cost += entry.total_cost;
        } catch (parseError) {
          // Skip malformed lines
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
        byModel: {},
      };
    }
  }

  /**
   * Print usage summary
   */
  printUsageSummary(): void {
    const usage = this.getTotalUsage();

    log.info('========== LLM USAGE SUMMARY ==========');
    log.info(`Total calls: ${usage.totalCalls}`);
    log.info(`Total tokens: ${usage.totalTokens.toLocaleString()}`);
    log.info(`Total cost: $${usage.totalCost.toFixed(4)}`);
    log.info('');
    log.info('By model:');
    for (const [model, stats] of Object.entries(usage.byModel)) {
      log.info(
        `  ${model}: ${stats.calls} calls, ` +
        `${stats.tokens.toLocaleString()} tokens, ` +
        `$${stats.cost.toFixed(4)}`
      );
    }
    log.info('=======================================');
  }

  /**
   * Clear log file
   */
  clearLogs(): void {
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

/**
 * Global LLM logger instance
 */
export const llmLogger = new LLMLogger();
