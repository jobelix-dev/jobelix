import * as fs from "fs";
import * as path from "path";
import { getDebugHtmlPath } from "./paths.js";
import { createLogger } from "./logger.js";
const log = createLogger("DebugHtml");
async function saveDebugHtml(page, context, jobTitle = "") {
  try {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const safeTitle = jobTitle.replace(/\s+/g, "_").replace(/[/\\]/g, "_").slice(0, 50);
    const filename = safeTitle ? `${context}_${safeTitle}_${timestamp}.html` : `${context}_${timestamp}.html`;
    const debugDir = getDebugHtmlPath();
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    const filepath = path.join(debugDir, filename);
    const htmlContent = await page.content();
    const url = page.url();
    const fullContent = `<!-- Debug HTML Snapshot -->
<!-- Context: ${context} -->
<!-- Job Title: ${jobTitle || "N/A"} -->
<!-- URL: ${url} -->
<!-- Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()} -->

${htmlContent}`;
    fs.writeFileSync(filepath, fullContent, "utf-8");
    log.info(`\u{1F4F8} Saved: ${filepath}`);
    return filepath;
  } catch (error) {
    log.error(`Failed to save debug HTML: ${error}`);
    return null;
  }
}
function cleanupOldDebugFiles(maxAgeDays = 7) {
  try {
    const debugDir = getDebugHtmlPath();
    if (!fs.existsSync(debugDir)) return;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1e3;
    const now = Date.now();
    const files = fs.readdirSync(debugDir);
    let cleaned = 0;
    for (const file of files) {
      const filepath = path.join(debugDir, file);
      const stat = fs.statSync(filepath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filepath);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      log.info(`Cleaned up ${cleaned} old debug HTML files`);
    }
  } catch (error) {
    log.warn(`Failed to cleanup debug files: ${error}`);
  }
}
export {
  cleanupOldDebugFiles,
  saveDebugHtml
};
//# sourceMappingURL=debug-html.js.map
