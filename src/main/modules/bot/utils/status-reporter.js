import { createLogger } from "./logger.js";
const log = createLogger("StatusReporter");
class StatusReporter {
  constructor() {
    this.mainWindow = null;
    this.stopped = false;
    this.stats = {
      jobsFound: 0,
      jobsApplied: 0,
      jobsFailed: 0,
      creditsUsed: 0
    };
  }
  /**
   * Set the main window for IPC communication
   */
  setMainWindow(window) {
    this.mainWindow = window;
    log.debug("Main window set for IPC");
  }
  /**
   * Emit a status message to the renderer
   */
  emit(message) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      log.warn("Cannot emit status - no main window");
      return;
    }
    try {
      this.mainWindow.webContents.send("bot-status", message);
      log.debug(`Emitted: ${message.type} - ${message.activity || ""}`);
    } catch (error) {
      log.error("Failed to emit status", error);
    }
  }
  /**
   * Signal session start
   */
  startSession(botVersion, platform) {
    log.info(`Starting session - v${botVersion} on ${platform}`);
    this.stopped = false;
    this.stats = { jobsFound: 0, jobsApplied: 0, jobsFailed: 0, creditsUsed: 0 };
    this.emit({
      type: "session_start",
      details: { botVersion, platform },
      stats: this.stats
    });
  }
  /**
   * Send a heartbeat with current activity
   * Returns false if the session was stopped
   */
  sendHeartbeat(activity, details) {
    if (this.stopped) {
      log.debug("Skipping heartbeat - session stopped");
      return false;
    }
    this.emit({
      type: "heartbeat",
      activity,
      details,
      stats: this.stats
    });
    return true;
  }
  /**
   * Signal session completion
   */
  completeSession(success, errorMessage) {
    log.info(`Session complete: ${success ? "success" : "failed"}`);
    this.emit({
      type: "session_complete",
      success,
      errorMessage,
      stats: this.stats
    });
  }
  /**
   * Mark session as stopped (called on SIGTERM or user stop)
   */
  markStopped() {
    this.stopped = true;
    log.info("Session marked as stopped");
    this.emit({
      type: "stopped",
      details: { reason: "User requested stop" },
      stats: this.stats
    });
  }
  /**
   * Check if session was stopped
   */
  isStopped() {
    return this.stopped;
  }
  // =========================================================================
  // Statistics Methods
  // =========================================================================
  incrementJobsFound(count = 1) {
    this.stats.jobsFound += count;
    log.debug(`Jobs found: +${count} (total: ${this.stats.jobsFound})`);
  }
  incrementJobsApplied(count = 1) {
    this.stats.jobsApplied += count;
    log.debug(`Jobs applied: +${count} (total: ${this.stats.jobsApplied})`);
  }
  incrementJobsFailed(count = 1) {
    this.stats.jobsFailed += count;
    log.debug(`Jobs failed: +${count} (total: ${this.stats.jobsFailed})`);
  }
  incrementCreditsUsed(count = 1) {
    this.stats.creditsUsed += count;
    log.debug(`Credits used: +${count} (total: ${this.stats.creditsUsed})`);
  }
  getStats() {
    return { ...this.stats };
  }
}
const statusReporter = new StatusReporter();
export {
  StatusReporter,
  statusReporter
};
//# sourceMappingURL=status-reporter.js.map
