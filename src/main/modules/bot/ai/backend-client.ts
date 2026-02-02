/**
 * Backend API Client for GPT Requests
 * 
 * Client for communicating with custom backend API that proxies GPT-4 requests.
 * Port of Python's src/ai/backend_client.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { getDataFolderPath } from '../utils/paths';

const log = createLogger('BackendClient');

/**
 * Message format for chat completion
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  total_cost?: number;
}

/**
 * Chat completion response from backend
 */
export interface ChatCompletionResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finish_reason: string;
}

/**
 * Backend API client options
 */
export interface BackendClientOptions {
  token: string;
  apiUrl: string;
  timeout?: number;
  logRequests?: boolean;
}

/**
 * Client for backend API that proxies GPT requests
 */
export class BackendAPIClient {
  private token: string;
  private apiUrl: string;
  private timeout: number;
  private logRequests: boolean;

  constructor(options: BackendClientOptions) {
    this.token = options.token;
    this.apiUrl = options.apiUrl;
    this.timeout = options.timeout || 120000; // 120 seconds (resume scoring can take 60-90s)
    this.logRequests = options.logRequests ?? true;

    log.info(`Initialized with endpoint: ${this.apiUrl}`);
    log.debug(`Token: ${this.token.substring(0, 8)}...${this.token.substring(this.token.length - 8)}`);
  }

  /**
   * Send a chat completion request to the backend API
   */
  async chatCompletion(
    messages: ChatMessage[],
    model: string = 'gpt-4o-mini',
    temperature: number = 0.8
  ): Promise<ChatCompletionResponse> {
    const payload = {
      token: this.token,
      messages,
      model,
      temperature,
    };

    log.debug(`Sending request: model=${model}, messages=${messages.length}`);
    if (messages.length > 0) {
      log.debug(`First message: ${messages[0].content.substring(0, 100)}...`);
    }

    try {
      // Use global fetch (Node 18+)
      const fetchFn = (globalThis as { fetch?: typeof fetch }).fetch;
      if (!fetchFn) {
        throw new Error('Global fetch is not available. Requires Node.js 18+ or polyfill.');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetchFn(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LinkedInAutoApply/2.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        log.error(`HTTP error ${response.status}: ${errorText}`);
        throw new Error(`Backend API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // DEBUG: Log full response for troubleshooting
      log.info('========== RAW BACKEND RESPONSE ==========');
      log.info(`Full response: ${JSON.stringify(data, null, 2)}`);
      log.info('==========================================');
      log.debug(`Response keys: ${Object.keys(data).join(', ')}`);

      // Validate response structure
      if (!data.content) {
        log.error('❌ INVALID RESPONSE FORMAT!');
        log.error(`Expected: {content: string, usage: object, model: string, finish_reason: string}`);
        log.error(`Received keys: ${Object.keys(data).join(', ')}`);
        log.error(`Full response: ${JSON.stringify(data, null, 2)}`);

        // Detect wrong format
        if ('result' in data || 'success' in data) {
          log.error('⚠️  DETECTED WRONG FORMAT: Backend is returning {success, result} format');
          log.error('⚠️  Backend must transform OpenAI response BEFORE returning');
          log.error('⚠️  See BACKEND_FIX_URGENT.md for fix instructions');
        }

        throw new Error('Invalid response: missing content field. Backend must return transformed format.');
      }

      log.debug(`✅ Valid response: ${data.content?.length || 0} chars`);

      const response_data: ChatCompletionResponse = {
        content: data.content,
        usage: data.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
        model: data.model || model,
        finish_reason: data.finish_reason || 'unknown',
      };

      // Log the request/response if enabled
      if (this.logRequests) {
        await this.logRequest(messages, response_data);
      }

      return response_data;
    } catch (error: unknown) {
      const err = error as Error & { cause?: { message?: string; code?: string } };
      if (err.name === 'AbortError') {
        log.error(`Request timeout after ${this.timeout / 1000} seconds`);
        throw new Error('Backend API request timeout');
      }

      // Enhanced error diagnostics
      log.error(`❌ Request failed to ${this.apiUrl}`);
      log.error(`Error type: ${err.constructor.name}`);
      log.error(`Error message: ${err.message || err}`);
      
      if (err.cause) {
        log.error(`Underlying cause: ${err.cause.message || err.cause}`);
        log.error(`Cause code: ${err.cause.code}`);
      }
      
      // Common issues
      if (err.message?.includes('ECONNREFUSED')) {
        log.error('');
        log.error('🔴 CONNECTION REFUSED - Backend is not running!');
        log.error(`Make sure your Next.js backend is running at: ${this.apiUrl}`);
        log.error('Run: cd jobelix && npm run dev');
        log.error('');
      } else if (err.message?.includes('ENOTFOUND') || err.message?.includes('getaddrinfo')) {
        log.error('');
        log.error('🔴 DNS/HOST NOT FOUND - Cannot resolve backend URL');
        log.error(`Check if ${this.apiUrl} is accessible`);
        log.error('');
      } else if (err.message?.includes('certificate') || err.message?.includes('TLS')) {
        log.error('');
        log.error('🔴 SSL/TLS ERROR - Certificate validation failed');
        log.error('For local development, use http:// instead of https://');
        log.error('');
      }

      throw err;
    }
  }

  /**
   * Log API request and response to JSON file
   */
  private async logRequest(messages: ChatMessage[], response: ChatCompletionResponse): Promise<void> {
    const dataFolder = getDataFolderPath();
    const logsPath = path.join(dataFolder, 'output');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true });
    }

    const callsLog = path.join(logsPath, 'backend_api_calls.json');

    const logEntry = {
      model: response.model,
      time: new Date().toISOString(),
      messages,
      response: response.content,
      total_tokens: response.usage.total_tokens,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_cost: response.usage.total_cost || 0,
      finish_reason: response.finish_reason,
    };

    try {
      // Append to log file
      const logLine = JSON.stringify(logEntry, null, 2) + '\n';
      fs.appendFileSync(callsLog, logLine, 'utf-8');
      log.debug(`Call logged to ${callsLog}`);
    } catch (error) {
      log.warn(`Failed to write to ${callsLog}: ${error}`);
    }
  }

  /**
   * Test connection to backend API
   */
  async testConnection(): Promise<boolean> {
    try {
      const testMessages: ChatMessage[] = [
        { role: 'user', content: 'Hello, this is a connection test.' }
      ];
      
      await this.chatCompletion(testMessages, 'gpt-4o-mini', 0.5);
      log.info('✅ Backend API connection test successful');
      return true;
    } catch (error) {
      log.error(`❌ Backend API connection test failed: ${error}`);
      return false;
    }
  }
}
