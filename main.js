const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

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
  const getConfigPath = () => {
    const resourceRoot = app.isPackaged 
      ? process.resourcesPath 
      : path.join(__dirname, 'resources');
    return path.join(resourceRoot, 'linux', 'main', 'data_folder', 'config.yaml');
  };

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

  ipcMain.handle('write-resume', async (event, content) => {
    try {
      const resourceRoot = app.isPackaged 
        ? process.resourcesPath 
        : path.join(__dirname, 'resources');
      
      const resumePath = path.join(resourceRoot, 'linux', 'main', 'data_folder', 'resume.yaml');
      const dir = path.dirname(resumePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(resumePath, content, 'utf-8');
      console.log('Resume written to:', resumePath);
      return { success: true, path: resumePath };
    } catch (error) {
      console.error('Error writing resume:', error);
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
    fullscreen: true,
    center: true,
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
    ? 'https://vercel-app-url'  
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

app.whenReady().then(() => {
  setupIpcHandlers();
  startPython();
  createWindow();
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