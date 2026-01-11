const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let pythonProcess;

function startPython() {
  // 1. Détection de l'OS et du dossier
  let platformFolder = '';
  let execName = 'engine';

  if (process.platform === 'win32') {
    platformFolder = 'win';
    execName = 'engine.exe';
  } else if (process.platform === 'darwin') {
    platformFolder = 'mac';
  } else if (process.platform === 'linux') {
    platformFolder = 'linux';
  } else {
    console.error("OS non supporté : " + process.platform);
    return;
  }

  // 2. Construction du chemin vers /resources/win/engine.exe
  const resourceRoot = app.isPackaged 
    ? process.resourcesPath 
    : path.join(__dirname, 'resources');

  const scriptPath = path.join(resourceRoot, platformFolder, execName);

  console.log(`Chemin calculé : ${scriptPath}`);

  // 3. Vérification de sécurité
  if (!fs.existsSync(scriptPath)) {
    console.error("ERREUR CRITIQUE : Fichier introuvable à :", scriptPath);
    console.error("Vérifiez que vous avez bien créé le dossier 'resources/win' et mis engine.exe dedans.");
    return;
  }

  // 4. Lancement
  console.log("Lancement du moteur Python...");
  pythonProcess = spawn(scriptPath);

  pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`));
  pythonProcess.stderr.on('data', (data) => console.error(`Python Error: ${data}`));
}

// IPC Handlers for secure local file access
function setupIpcHandlers() {
  const getSecretsPath = () => {
    const resourceRoot = app.isPackaged 
      ? process.resourcesPath 
      : path.join(__dirname, 'resources');
    return path.join(resourceRoot, 'linux', 'main', 'data_folder', 'secrets.yaml');
  };

  const getConfigPath = () => {
    const resourceRoot = app.isPackaged 
      ? process.resourcesPath 
      : path.join(__dirname, 'resources');
    return path.join(resourceRoot, 'linux', 'main', 'data_folder', 'config.yaml');
  };

  ipcMain.handle('read-secrets', async () => {
    try {
      const secretsPath = getSecretsPath();
      if (!fs.existsSync(secretsPath)) {
        return { success: false, email: '', password: '' };
      }
      const content = fs.readFileSync(secretsPath, 'utf-8');
      
      // Parse YAML
      const emailMatch = content.match(/email:\s*"([^"]+)"/);
      const passwordMatch = content.match(/password:\s*"([^"]+)"/);
      
      return {
        success: true,
        email: emailMatch ? emailMatch[1] : '',
        password: passwordMatch ? passwordMatch[1] : '',
      };
    } catch (error) {
      console.error('Error reading secrets:', error);
      return { success: false, email: '', password: '' };
    }
  });

  ipcMain.handle('write-secrets', async (event, content) => {
    try {
      const secretsPath = getSecretsPath();
      const dir = path.dirname(secretsPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(secretsPath, content, 'utf-8');
      console.log('Secrets written to:', secretsPath);
      return { success: true };
    } catch (error) {
      console.error('Error writing secrets:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-config', async () => {
    try {
      const configPath = getConfigPath();
      if (!fs.existsSync(configPath)) {
        return { success: false, content: '' };
      }
      const content = fs.readFileSync(configPath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      console.error('Error reading config:', error);
      return { success: false, content: '' };
    }
  });

  ipcMain.handle('write-config', async (event, content) => {
    try {
      const configPath = getConfigPath();
      const dir = path.dirname(configPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, content, 'utf-8');
      console.log('Config written to:', configPath);
      return { success: true };
    } catch (error) {
      console.error('Error writing config:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('launch-bot', async (event, token) => {
    try {
      if (!token) {
        return { success: false, error: 'Token is required' };
      }

      // Detect OS
      let platformFolder = '';
      let execName = 'main';

      if (process.platform === 'win32') {
        platformFolder = 'win';
        execName = 'main.exe';
      } else if (process.platform === 'darwin') {
        platformFolder = 'mac';
      } else if (process.platform === 'linux') {
        platformFolder = 'linux';
      } else {
        return { success: false, error: 'Unsupported operating system: ' + process.platform };
      }

      // Construct path to bot executable
      const resourceRoot = app.isPackaged 
        ? process.resourcesPath 
        : path.join(__dirname, 'resources');

      const botPath = path.join(resourceRoot, platformFolder, 'main', execName);
      const botCwd = path.join(resourceRoot, platformFolder, 'main');

      console.log('Bot path:', botPath);
      console.log('Bot working directory:', botCwd);
      console.log('OS detected:', process.platform);

      // Verify bot executable exists
      if (!fs.existsSync(botPath)) {
        return { 
          success: false, 
          error: 'Bot executable not found at: ' + botPath 
        };
      }

      // Spawn the bot process with --playwright flag and token
      const botProcess = spawn(botPath, ['--playwright', token], {
        detached: true,
        stdio: 'ignore',
        cwd: botCwd
      });

      // Detach the process so it continues running independently
      botProcess.unref();

      console.log('Bot process started with PID:', botProcess.pid);
      console.log('Command:', botPath, '--playwright', '[TOKEN]');

      return {
        success: true,
        message: 'Bot launched successfully',
        pid: botProcess.pid,
        platform: process.platform
      };
    } catch (error) {
      console.error('Error launching bot:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error launching bot' 
      };
    }
  });
}

/**
 * Compare two semantic version strings (e.g., "1.2.3")
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  
  return 0;
}

/**
 * Read version from a file
 */
function readVersionFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }
    console.warn(`Version file not found: ${filePath}`);
    return '0.0.0';
  } catch (error) {
    console.error('Error reading version file:', error);
    return '0.0.0';
  }
}

/**
 * Get current app version from package.json
 */
function getCurrentAppVersion() {
  try {
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch (error) {
    console.error('Error reading package.json:', error);
    return '0.0.0';
  }
}

/**
 * Get current engine version from resources/{os}/version.txt
 */
function getCurrentEngineVersion() {
  let platformFolder = '';
  
  if (process.platform === 'win32') {
    platformFolder = 'win';
  } else if (process.platform === 'darwin') {
    platformFolder = 'mac';
  } else if (process.platform === 'linux') {
    platformFolder = 'linux';
  } else {
    console.error("OS non supporté : " + process.platform);
    return '0.0.0';
  }

  const resourceRoot = app.isPackaged 
    ? process.resourcesPath 
    : path.join(__dirname, 'resources');
  
  const versionFilePath = path.join(resourceRoot, platformFolder, 'version.txt');
  return readVersionFile(versionFilePath);
}

/**
 * Fetch required versions from Vercel endpoint
 */
async function fetchRequiredVersions() {
  return new Promise((resolve, reject) => {
    const url = app.isPackaged 
      ? 'https://www.jobelix.fr/api/required-versions'
      : 'http://localhost:3000/api/required-versions';

    const protocol = url.startsWith('https') ? https : require('http');
    
    protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success && parsed.required) {
            resolve(parsed.required);
          } else {
            reject(new Error('Invalid response format'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if app and engine versions meet minimum requirements
 * Returns: { isCompatible: boolean, details: object }
 */
async function checkForUpdates() {
  try {
    console.log('Checking for required updates...');
    
    // Get current versions
    const currentAppVersion = getCurrentAppVersion();
    const currentEngineVersion = getCurrentEngineVersion();
    
    console.log(`Current App Version: ${currentAppVersion}`);
    console.log(`Current Engine Version: ${currentEngineVersion}`);
    
    // Fetch required versions from server
    const required = await fetchRequiredVersions();
    
    console.log(`Required App Version: ${required.app.version}`);
    console.log(`Required Engine Version: ${required.engine.version}`);
    
    // Compare versions
    const appComparison = compareVersions(currentAppVersion, required.app.version);
    const engineComparison = compareVersions(currentEngineVersion, required.engine.version);
    
    const isAppCompatible = appComparison >= 0;
    const isEngineCompatible = engineComparison >= 0;
    const isCompatible = isAppCompatible && isEngineCompatible;
    
    const details = {
      isCompatible,
      currentAppVersion,
      currentEngineVersion,
      requiredAppVersion: required.app.version,
      requiredEngineVersion: required.engine.version,
      downloadUrl: required.downloadUrl,
      appNeedsUpdate: !isAppCompatible,
      engineNeedsUpdate: !isEngineCompatible,
      message: !isCompatible 
        ? (!isAppCompatible && !isEngineCompatible 
            ? 'Both app and engine need to be updated' 
            : !isAppCompatible 
              ? required.app.message 
              : required.engine.message)
        : 'All components are up to date'
    };
    
    if (isCompatible) {
      console.log('App is compatible with server requirements');
    } else {
      console.log('Update required!');
      console.log(`  App compatible: ${isAppCompatible}`);
      console.log(`  Engine compatible: ${isEngineCompatible}`);
    }
    
    return details;
  } catch (error) {
    console.error('Failed to check for updates:', error.message);
    // In case of error, allow the app to proceed (fail gracefully)
    return {
      isCompatible: true,
      error: error.message,
      message: 'Update check failed, proceeding with current version'
    };
  }
}

/**
 * Show update required window
 */
function showUpdateRequiredWindow(details) {
  const updateWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: false,
    autoHideMenuBar: true,
    title: 'Update Required - Jobelix',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Build URL with version parameters
  const params = new URLSearchParams({
    currentApp: details.currentAppVersion,
    requiredApp: details.requiredAppVersion,
    currentEngine: details.currentEngineVersion,
    requiredEngine: details.requiredEngineVersion,
    downloadUrl: details.downloadUrl
  });

  const updatePagePath = path.join(__dirname, 'update-required.html');
  updateWindow.loadFile(updatePagePath, { query: Object.fromEntries(params) });

  // Open external links in browser
  updateWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent closing
  updateWindow.on('close', (e) => {
    e.preventDefault();
    // User must update - prevent closing the update window
  });
}

/**
 * Configure electron-updater
 */
function setupAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = false; // Don't auto-download, ask user first
  autoUpdater.autoInstallOnAppQuit = true; // Auto-install when app quits
  
  // Logging
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';
  
  console.log('Auto-updater configured');
  
  // Check for updates (will use GitHub releases based on package.json config)
  if (app.isPackaged) {
    console.log('Checking for updates from GitHub releases...');
    autoUpdater.checkForUpdates();
  }
}

/**
 * Setup auto-updater event listeners
 */
function setupAutoUpdaterListeners() {
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    
    // Send notification to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      });
    }
    
    // Auto-download the update
    console.log('Downloading update...');
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available. Current version is', info.version);
  });

  autoUpdater.on('error', (err) => {
    console.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    console.log(logMessage);
    
    // Send progress to renderer
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded. Version:', info.version);
    
    // Notify user that update is ready
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version
      });
    }
    
    // Install update on next restart (or immediately if user confirms)
    // autoUpdater.quitAndInstall(); // Uncomment to force immediate restart
  });
}

// Wait for Next.js server to be ready
async function waitForNextJs(url, maxAttempts = 30, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✓ Next.js is ready after ${i * delayMs}ms`);
        return true;
      }
    } catch (err) {
      console.log(`Waiting for Next.js... (attempt ${i + 1}/${maxAttempts})`);
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  console.error('Next.js failed to start in time');
  return false;
}

async function createWindow() {
  const splash = new BrowserWindow({
    width: 400, 
    height: 300, 
    transparent: false, 
    frame: false, 
    alwaysOnTop: true,
    center: true
  });
  
  splash.loadFile('loader.html');

  mainWin = new BrowserWindow({ 
    width: 1200, 
    height: 800, 
    show: false,
    autoHideMenuBar: true,
    title: "Jobelix",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  
  const startUrl = app.isPackaged 
    ? 'https://www.jobelix.fr'  
    : 'http://localhost:3000';
  
  // Wait for Next.js to be ready before loading
  if (!app.isPackaged) {
    console.log("Waiting for Next.js server...");
    await waitForNextJs(startUrl);
  }
  
  console.log("Chargement de l'URL :", startUrl);
  mainWin.loadURL(startUrl);

  mainWin.once('ready-to-show', () => {
    splash.destroy(); // On détruit le loader
    mainWin.show();   // On affiche le site
  });
}

app.whenReady().then(async () => {
  setupIpcHandlers();
  setupAutoUpdaterListeners();
  
  // In development mode, wait for Next.js to be ready before checking versions
  if (!app.isPackaged) {
    console.log('Development mode: Waiting for Next.js server...');
    const isReady = await waitForNextJs('http://localhost:3000');
    if (!isReady) {
      console.error('Next.js server did not start in time. Starting app anyway...');
    }
  }
  
  // Check for updates before starting the app
  const versionCheck = await checkForUpdates();
  
  if (!versionCheck.isCompatible) {
    // Show update required window and block app
    console.log('Blocking app launch - update required');
    showUpdateRequiredWindow(versionCheck);
    // Do not start Python or create main window
  } else {
    // Versions are compatible, proceed normally
    console.log('Starting app normally');
    startPython();
    createWindow();
    
    // Setup auto-updater for seamless updates (only in production)
    if (app.isPackaged) {
      setupAutoUpdater();
    }
  }
});

app.on('will-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});