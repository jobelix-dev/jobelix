import * as fs from "fs";
import * as path from "path";
import { createLogger } from "../utils/logger.js";
import { getDataFolderPath } from "../utils/paths.js";
const log = createLogger("BackendClient");
class BackendAPIClient {
  constructor(options) {
    this.token = options.token;
    this.apiUrl = options.apiUrl;
    this.timeout = options.timeout || 12e4;
    this.logRequests = options.logRequests ?? true;
    log.info(`Initialized with endpoint: ${this.apiUrl}`);
    log.debug(`Token: ${this.token.substring(0, 8)}...${this.token.substring(this.token.length - 8)}`);
  }
  /**
   * Send a chat completion request to the backend API
   */
  async chatCompletion(messages, model = "gpt-4o-mini", temperature = 0.8) {
    const payload = {
      token: this.token,
      messages,
      model,
      temperature
    };
    log.debug(`Sending request: model=${model}, messages=${messages.length}`);
    if (messages.length > 0) {
      log.debug(`First message: ${messages[0].content.substring(0, 100)}...`);
    }
    try {
      const fetchFn = globalThis.fetch;
      if (!fetchFn) {
        throw new Error("Global fetch is not available. Requires Node.js 18+ or polyfill.");
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const response = await fetchFn(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "LinkedInAutoApply/2.0"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        log.error(`HTTP error ${response.status}: ${errorText}`);
        throw new Error(`Backend API error: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      log.info("========== RAW BACKEND RESPONSE ==========");
      log.info(`Full response: ${JSON.stringify(data, null, 2)}`);
      log.info("==========================================");
      log.debug(`Response keys: ${Object.keys(data).join(", ")}`);
      if (!data.content) {
        log.error("\u274C INVALID RESPONSE FORMAT!");
        log.error(`Expected: {content: string, usage: object, model: string, finish_reason: string}`);
        log.error(`Received keys: ${Object.keys(data).join(", ")}`);
        log.error(`Full response: ${JSON.stringify(data, null, 2)}`);
        if ("result" in data || "success" in data) {
          log.error("\u26A0\uFE0F  DETECTED WRONG FORMAT: Backend is returning {success, result} format");
          log.error("\u26A0\uFE0F  Backend must transform OpenAI response BEFORE returning");
          log.error("\u26A0\uFE0F  See BACKEND_FIX_URGENT.md for fix instructions");
        }
        throw new Error("Invalid response: missing content field. Backend must return transformed format.");
      }
      log.debug(`\u2705 Valid response: ${data.content?.length || 0} chars`);
      const response_data = {
        content: data.content,
        usage: data.usage || { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
        model: data.model || model,
        finish_reason: data.finish_reason || "unknown"
      };
      if (this.logRequests) {
        await this.logRequest(messages, response_data);
      }
      return response_data;
    } catch (error) {
      const err = error;
      if (err.name === "AbortError") {
        log.error(`Request timeout after ${this.timeout / 1e3} seconds`);
        throw new Error("Backend API request timeout");
      }
      log.error(`\u274C Request failed to ${this.apiUrl}`);
      log.error(`Error type: ${err.constructor.name}`);
      log.error(`Error message: ${err.message || err}`);
      if (err.cause) {
        log.error(`Underlying cause: ${err.cause.message || err.cause}`);
        log.error(`Cause code: ${err.cause.code}`);
      }
      if (err.message?.includes("ECONNREFUSED")) {
        log.error("");
        log.error("\u{1F534} CONNECTION REFUSED - Backend is not running!");
        log.error(`Make sure your Next.js backend is running at: ${this.apiUrl}`);
        log.error("Run: cd jobelix && npm run dev");
        log.error("");
      } else if (err.message?.includes("ENOTFOUND") || err.message?.includes("getaddrinfo")) {
        log.error("");
        log.error("\u{1F534} DNS/HOST NOT FOUND - Cannot resolve backend URL");
        log.error(`Check if ${this.apiUrl} is accessible`);
        log.error("");
      } else if (err.message?.includes("certificate") || err.message?.includes("TLS")) {
        log.error("");
        log.error("\u{1F534} SSL/TLS ERROR - Certificate validation failed");
        log.error("For local development, use http:// instead of https://");
        log.error("");
      }
      throw err;
    }
  }
  /**
   * Log API request and response to JSON file
   */
  async logRequest(messages, response) {
    const dataFolder = getDataFolderPath();
    const logsPath = path.join(dataFolder, "output");
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true });
    }
    const callsLog = path.join(logsPath, "backend_api_calls.json");
    const logEntry = {
      model: response.model,
      time: (/* @__PURE__ */ new Date()).toISOString(),
      messages,
      response: response.content,
      total_tokens: response.usage.total_tokens,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_cost: response.usage.total_cost || 0,
      finish_reason: response.finish_reason
    };
    try {
      const logLine = JSON.stringify(logEntry, null, 2) + "\n";
      fs.appendFileSync(callsLog, logLine, "utf-8");
      log.debug(`Call logged to ${callsLog}`);
    } catch (error) {
      log.warn(`Failed to write to ${callsLog}: ${error}`);
    }
  }
  /**
   * Test connection to backend API
   */
  async testConnection() {
    try {
      const testMessages = [
        { role: "user", content: "Hello, this is a connection test." }
      ];
      await this.chatCompletion(testMessages, "gpt-4o-mini", 0.5);
      log.info("\u2705 Backend API connection test successful");
      return true;
    } catch (error) {
      log.error(`\u274C Backend API connection test failed: ${error}`);
      return false;
    }
  }
}
export {
  BackendAPIClient
};
//# sourceMappingURL=backend-client.js.map
