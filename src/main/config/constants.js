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
};

// Executable names
export const EXECUTABLES = {
  ENGINE: {
    BASE: 'engine',
    WINDOWS: 'engine.exe',
  },
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
    fullscreen: true,
    center: true,
    show: false,
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
  
  // Renderer → Main (handlers)
  READ_CONFIG: 'read-config',
  WRITE_CONFIG: 'write-config',
  WRITE_RESUME: 'write-resume',
  LAUNCH_BOT: 'launch-bot',
};

// Version management
export const VERSION = {
  DEFAULT: '0.0.0',
};

// Spawn process configurations
export const SPAWN_CONFIG = {
  BOT: {
    detached: true,
    stdio: 'ignore',
  },
  ENGINE: {
    // Standard spawn, will use default options
  },
};
