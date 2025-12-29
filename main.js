const { app, BrowserWindow } = require('electron');
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
      nodeIntegration: false, // Sécurité : Le site web ne peut pas toucher au PC directement
      contextIsolation: true,
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