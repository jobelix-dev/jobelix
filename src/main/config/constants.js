/**
 * Application constants and configuration values
 * Centralized location for all hardcoded values used throughout the Electron main process
 */

// Application URLs
export const URLS = {
  PRODUCTION: 'https://www.jobelix.fr',
  DEVELOPMENT: 'http://localhost:3000',
  API: {
    REQUIRED_VERSIONS: '/api/required-versions',
  },
};

// File and directory names
export const FILES = {
  LOADER: 'loader.html',
  UPDATE_REQUIRED: 'update-required.html',
  PRELOAD: 'preload.js',
  ICON: 'icon.png',
  PACKAGE_JSON: 'package.json',
  CONFIG_YAML: 'config.yaml',
  RESUME_YAML: 'resume.yaml',
  VERSION_TXT: 'version.txt',
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
export const WINDOW_CONFIG = {
  SPLASH: {
    width: 400,
    height: 300,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    center: true,
  },
  UPDATE: {
    width: 600,
    height: 700,
    resizable: false,
    autoHideMenuBar: true,
    title: 'Update Required - Jobelix',
  },
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
  AUTO_INSTALL_DELAY_MS: 2000,
};

// IPC channel names
export const IPC_CHANNELS = {
  // Main → Renderer
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_DOWNLOAD_PROGRESS: 'update-download-progress',
  UPDATE_DOWNLOADED: 'update-downloaded',
  UPDATE_ERROR: 'update-error',
  BOT_STATUS: 'bot-status',
  
  // Renderer → Main (handlers)
  READ_CONFIG: 'read-config',
  WRITE_CONFIG: 'write-config',
  WRITE_RESUME: 'write-resume',
  LAUNCH_BOT: 'launch-bot',
  STOP_BOT: 'stop-bot',
  
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
};

// Version management
export const VERSION = {
  DEFAULT: '0.0.0',
};

// Spawn process configurations
export const SPAWN_CONFIG = {
  BOT: {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored, stdout/stderr piped for logging
  },
};
