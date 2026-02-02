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
   * Convert internal camelCase stats to snake_case for frontend
   */
  getSnakeCaseStats() {
    return {
      jobs_found: this.stats.jobsFound,
      jobs_applied: this.stats.jobsApplied,
      jobs_failed: this.stats.jobsFailed,
      credits_used: this.stats.creditsUsed
    };
  }
  /**
   * Emit a status message to the renderer
   * Uses the format expected by useBot.ts
   */
  emit(payload) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      log.warn("Cannot emit status - no main window");
      return;
    }
    try {
      this.mainWindow.webContents.send("bot-status", payload);
      log.debug(`Emitted: stage=${payload.stage} activity=${payload.activity || ""}`);
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
      stage: "running",
      message: "Bot session started",
      activity: "initializing",
      details: { botVersion, platform },
      stats: this.getSnakeCaseStats()
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
      stage: "running",
      activity,
      details,
      stats: this.getSnakeCaseStats()
    });
    return true;
  }
  /**
   * Signal session completion
   */
  completeSession(success, errorMessage) {
    log.info(`Session complete: ${success ? "success" : "failed"}`);
    this.emit({
      stage: success ? "completed" : "failed",
      message: errorMessage || (success ? "Session completed successfully" : "Session failed"),
      stats: this.getSnakeCaseStats()
    });
  }
  /**
   * Mark session as stopped (called on SIGTERM or user stop)
   */
  markStopped() {
    this.stopped = true;
    log.info("Session marked as stopped");
    this.emit({
      stage: "stopped",
      message: "User requested stop",
      details: { reason: "User requested stop" },
      stats: this.getSnakeCaseStats()
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
  /**
   * Emit a stats-only update to keep UI in sync
   * Called after each stat increment for real-time updates
   */
  emitStatsUpdate() {
    if (this.stopped) return;
    this.emit({
      stage: "running",
      activity: "stats_update",
      stats: this.getSnakeCaseStats()
    });
  }
  incrementJobsFound(count = 1) {
    this.stats.jobsFound += count;
    log.debug(`Jobs found: +${count} (total: ${this.stats.jobsFound})`);
    this.emitStatsUpdate();
  }
  incrementJobsApplied(count = 1) {
    this.stats.jobsApplied += count;
    log.debug(`Jobs applied: +${count} (total: ${this.stats.jobsApplied})`);
    this.emitStatsUpdate();
  }
  incrementJobsFailed(count = 1) {
    this.stats.jobsFailed += count;
    log.debug(`Jobs failed: +${count} (total: ${this.stats.jobsFailed})`);
    this.emitStatsUpdate();
  }
  incrementCreditsUsed(count = 1) {
    this.stats.creditsUsed += count;
    log.debug(`Credits used: +${count} (total: ${this.stats.creditsUsed})`);
    this.emitStatsUpdate();
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
