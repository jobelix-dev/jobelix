/**
 * Application constants and configuration values
 * Centralized location for all hardcoded values used throughout the Electron main process
 */

// Application URLs
export const URLS = {
  PRODUCTION: 'https://www.jobelix.fr',
  DEVELOPMENT: 'http://localhost:3000',
};

// File and directory names
export const FILES = {
  PRELOAD: 'preload.js',
  ICON: 'icon.png',
  LOADING_HTML: 'loading.html',
  PACKAGE_JSON: 'package.json',
  CONFIG_YAML: 'config.yaml',
  RESUME_YAML: 'resume.yaml',
  VERSION_TXT: 'version.txt',
};

// Version defaults
export const VERSION = {
  DEFAULT: '0.0.0',
};

// Directory paths (relative to resources)
export const DIRECTORIES = {
  BUILD: 'build',
  RESOURCES: 'resources',
  DATA_FOLDER: 'data_folder',
  MAIN: 'main',
};

// Platform-specific folder names
export const PLATFORM_FOLDERS = {
  WINDOWS: 'win',
  MAC: 'mac',
  LINUX: 'linux',
  LINUX_ARCH: 'linux-arch',
};

// Executable names
export const EXECUTABLES = {
  BOT: {
    BASE: 'main',
    WINDOWS: 'main.exe',
  },
};

// Window configurations
// NOTE: SPLASH config removed - startup is now fast (~100ms with APPIMAGE_EXTRACT_AND_RUN)
//       so splash screen is no longer needed
export const WINDOW_CONFIG = {
  MAIN: {
    width: 1200,
    height: 800,
    center: true,
    show: false,
    frame: false, // Custom window controls
    autoHideMenuBar: true,
    title: 'Jobelix',
  },
};

// Timing configurations
export const TIMING = {
  NEXT_JS_WAIT: {
    MAX_ATTEMPTS: 30,
    DELAY_MS: 500,
  },
};

// IPC channel names
export const IPC_CHANNELS = {
  // Main → Renderer (push events)
  BOT_STATUS: 'bot-status',
  BROWSER_INSTALL_PROGRESS: 'browser-install-progress',
  
  // Renderer → Main (handlers)
  READ_CONFIG: 'read-config',
  WRITE_CONFIG: 'write-config',
  WRITE_RESUME: 'write-resume',
  LAUNCH_BOT: 'launch-bot',
  STOP_BOT: 'stop-bot',
  FORCE_STOP_BOT: 'force-stop-bot',
  GET_BOT_STATUS: 'get-bot-status',
  GET_BOT_LOG_PATH: 'get-bot-log-path',
  
  // Browser management
  CHECK_BROWSER: 'check-browser',
  INSTALL_BROWSER: 'install-browser',
  
  // Auth cache
  SAVE_AUTH_CACHE: 'save-auth-cache',
  LOAD_AUTH_CACHE: 'load-auth-cache',
  CLEAR_AUTH_CACHE: 'clear-auth-cache',
  
  // Window controls
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_UNMAXIMIZE: 'window-unmaximize',
  WINDOW_CLOSE: 'window-close',
  WINDOW_IS_MAXIMIZED: 'window-is-maximized',
  
  // Update management
  OPEN_RELEASES_PAGE: 'open-releases-page',
};

// Bot configuration
// Node.js bot is the only option - Python bot has been removed
export const BOT_CONFIG = {};

// Spawn process configurations
export const SPAWN_CONFIG = {
  BOT: {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored, stdout/stderr piped for logging
  },
};
