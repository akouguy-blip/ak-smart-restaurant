/**
 * AK Smart Restaurant — Process principal Electron
 *
 * Responsabilités :
 *   1. Démarrer le backend NestJS en interne (dans le même processus)
 *   2. Ouvrir la fenêtre "console serveur" qui affiche IP, statut, stats
 *   3. Créer l'icône dans la barre des tâches (system tray)
 *   4. Gérer la fermeture propre (la fenêtre se ferme mais le serveur tourne)
 *   5. Single instance — on ne peut pas lancer 2 fois l'app
 */

import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ============================================================
// CONFIGURATION : où vivent les données + le backend
// ============================================================

// Dossier utilisateur où on stocke la base SQLite et les logs.
// Sur Windows : C:\Users\<user>\AppData\Roaming\AK Smart Restaurant\
// Sur Mac     : ~/Library/Application Support/AK Smart Restaurant/
const USER_DATA_DIR = app.getPath('userData');
const SQLITE_PATH = path.join(USER_DATA_DIR, 'akresto.db');
const LOG_PATH = path.join(USER_DATA_DIR, 'app.log');

// S'assurer que le dossier existe
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

// Variables d'environnement pour le backend embarqué
process.env.SQLITE_PATH = SQLITE_PATH;
process.env.PORT = process.env.PORT || '3838'; // Port distinct pour éviter conflits
process.env.NODE_ENV = 'production';

// JWT secret : généré une fois et stocké dans userData
const SECRET_PATH = path.join(USER_DATA_DIR, '.jwt_secret');
if (!fs.existsSync(SECRET_PATH)) {
  const secret = require('crypto').randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
}
process.env.JWT_SECRET = fs.readFileSync(SECRET_PATH, 'utf8').trim();
// Indique au backend NestJS où trouver le frontend (Vue) compilé
const frontendPath = app.isPackaged
  ? path.join(process.resourcesPath, 'frontend', 'dist')
  : path.join(__dirname, '..', '..', 'frontend', 'dist');
process.env.FRONTEND_PATH = frontendPath;

// ============================================================
// SINGLE INSTANCE — empêcher de lancer 2 fois l'app
// ============================================================

const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  // Une autre instance est déjà en cours : on quitte
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  // L'utilisateur a essayé de lancer une 2ème fois → on remet la fenêtre au premier plan
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ============================================================
// ÉTAT GLOBAL
// ============================================================

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let backendStarted = false;
let backendStartError: Error | null = null;
let isQuitting = false;

// ============================================================
// HELPERS
// ============================================================

function getLocalIPs(): string[] {
  const ips: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name] || [];
    for (const iface of ifaces) {
      // IPv4 non-loopback uniquement, et préférer les IP réseau local (192.168.*, 10.*, 172.16-31.*)
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  // Trier : adresses locales en premier (192.168.* > 10.* > autres)
  return ips.sort((a, b) => {
    const aPrio = a.startsWith('192.168.') ? 0 : a.startsWith('10.') ? 1 : 2;
    const bPrio = b.startsWith('192.168.') ? 0 : b.startsWith('10.') ? 1 : 2;
    return aPrio - bPrio;
  });
}

function appendLog(message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(message);
}

// ============================================================
// DÉMARRAGE DU BACKEND NESTJS
// ============================================================

/**
 * On localise le backend compilé (qui est dans extraResources/backend/dist en prod
 * ou dans ../backend/dist en dev) et on le charge dynamiquement.
 */
async function startBackend(): Promise<void> {
  // Détecter si on est en mode packaged (release) ou en dev
  const isPackaged = app.isPackaged;
  const backendMainPath = isPackaged
    ? path.join(process.resourcesPath, 'backend', 'dist', 'main.js')
    : path.join(__dirname, '..', '..', 'backend', 'dist', 'main.js');

  if (!fs.existsSync(backendMainPath)) {
    throw new Error(`Backend introuvable : ${backendMainPath}`);
  }

  // Aussi configurer node_modules path pour qu'il trouve les deps
  if (isPackaged) {
    // L'app Electron est dans app.asar (unpacked pour better-sqlite3 et co).
    // On prépend app.asar.unpacked/node_modules pour que les modules natifs
    // se résolvent vers la version compilée POUR ELECTRON (et pas Node système).
    const appPath = app.getAppPath();
    const unpackedModules = appPath.replace(/app\.asar$/, 'app.asar.unpacked') + '/node_modules';
    const backendNodeModules = path.join(process.resourcesPath, 'backend', 'node_modules');

    const paths = [unpackedModules, backendNodeModules];
    if (process.env.NODE_PATH) paths.push(process.env.NODE_PATH);
    process.env.NODE_PATH = paths.filter((p) => p && fs.existsSync(p)).join(path.delimiter);

    require('module').Module._initPaths();
    appendLog(`NODE_PATH configuré : ${process.env.NODE_PATH}`);
  }

  appendLog(`Démarrage backend depuis ${backendMainPath}…`);

  try {
    // Import dynamique du backend — il va démarrer son serveur HTTP au require
    require(backendMainPath);
    backendStarted = true;
    appendLog(`Backend démarré sur le port ${process.env.PORT}`);
  } catch (err: any) {
    backendStartError = err;
    appendLog(`Échec démarrage backend : ${err.message}`);
    throw err;
  }
}

// ============================================================
// FENÊTRE PRINCIPALE — CONSOLE SERVEUR
// ============================================================

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 580,
    minWidth: 600,
    minHeight: 480,
    title: 'AK Smart Restaurant — Console serveur',
    backgroundColor: '#0B0908',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // icon: path.join(__dirname, '..', 'build-resources', 'icon.png'),
  });

  // Charge l'interface console (fichier HTML local)
  const consoleHtml = path.join(__dirname, 'console.html');
  mainWindow.loadFile(consoleHtml);

  // Quand l'utilisateur ferme la fenêtre, on ne quitte PAS l'app
  // (le serveur continue de tourner en arrière-plan, accessible via tray)
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
      // Au premier hide, on informe via notification (Windows seulement)
      if (process.platform === 'win32' && !mainWindow!.webContents.session.cookies) {
        // Une vraie notification système serait ici
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // DevTools en mode dev seulement
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ============================================================
// SYSTEM TRAY (icône près de l'horloge Windows)
// ============================================================

function createTray() {
  // Icône simple générée (16x16 cercle doré) en attendant l'icône finale
  const iconPath = path.join(__dirname, '..', 'build-resources', 'tray-icon.png');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // Fallback : crée une icône vide minimale pour ne pas crasher
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('AK Smart Restaurant — Serveur actif');

  const updateMenu = () => {
    const ips = getLocalIPs();
    const port = process.env.PORT;
    const urls = ips.map((ip) => `http://${ip}:${port}`);

    const menu = Menu.buildFromTemplate([
      {
        label: backendStarted ? '✓ Serveur actif' : '⏳ Serveur démarre…',
        enabled: false,
      },
      { type: 'separator' },
      ...(urls.length > 0
        ? urls.map((url) => ({
            label: `Ouvrir ${url}`,
            click: () => shell.openExternal(url),
          }))
        : [{ label: 'Aucune IP détectée', enabled: false }]),
      { type: 'separator' },
      {
        label: 'Console serveur',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        },
      },
      {
        label: 'Démarrer au boot Windows',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            path: app.getPath('exe'),
          });
        },
      },
      { type: 'separator' },
      {
        label: 'Quitter complètement',
        click: () => {
          dialog
            .showMessageBox(mainWindow || (null as any), {
              type: 'warning',
              buttons: ['Annuler', 'Quitter'],
              defaultId: 0,
              cancelId: 0,
              title: 'Arrêter le serveur ?',
              message: 'Le restaurant ne pourra plus accéder à l\'application tant que vous n\'aurez pas relancé AK Smart Restaurant.',
              detail: 'Êtes-vous sûr de vouloir quitter ?',
            })
            .then((res) => {
              if (res.response === 1) {
                isQuitting = true;
                app.quit();
              }
            });
        },
      },
    ]);

    tray!.setContextMenu(menu);
  };

  updateMenu();

  // Mettre à jour le menu toutes les 10s (au cas où l'IP change, ex: changement de WiFi)
  setInterval(updateMenu, 10000);

  // Double-clic sur l'icône → ouvrir la console
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
}

// ============================================================
// IPC : exposer des infos à l'interface console
// ============================================================

ipcMain.handle('get-server-info', () => {
  return {
    ips: getLocalIPs(),
    port: process.env.PORT,
    backendStarted,
    backendError: backendStartError?.message || null,
    userDataDir: USER_DATA_DIR,
    dbPath: SQLITE_PATH,
    logPath: LOG_PATH,
    autoLaunch: app.getLoginItemSettings().openAtLogin,
    version: app.getVersion(),
  };
});

ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath('exe'),
  });
  return { ok: true };
});

ipcMain.handle('open-db-folder', () => {
  shell.openPath(USER_DATA_DIR);
  return { ok: true };
});

ipcMain.handle('open-log-file', () => {
  shell.openPath(LOG_PATH);
  return { ok: true };
});

ipcMain.handle('open-url', (_event, url: string) => {
  shell.openExternal(url);
  return { ok: true };
});

// ============================================================
// CYCLE DE VIE DE L'APPLICATION
// ============================================================

app.whenReady().then(async () => {
  appendLog('=== AK Smart Restaurant démarrage ===');
  appendLog(`Plateforme : ${process.platform} ${process.arch}`);
  appendLog(`Version : ${app.getVersion()}`);
  appendLog(`Dossier utilisateur : ${USER_DATA_DIR}`);

  // 1. Crée la fenêtre console
  createMainWindow();

  // 2. Crée l'icône system tray
  createTray();

  // 3. Démarre le backend en arrière-plan (n'attend pas la complétion)
  try {
    await startBackend();
  } catch (err: any) {
    dialog.showErrorBox(
      'Erreur de démarrage',
      `Le serveur n'a pas pu démarrer :\n\n${err.message}\n\nConsulte les logs : ${LOG_PATH}`,
    );
  }
});

// Sur macOS, garde l'app active même si toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('activate', () => {
  // macOS : clic sur le dock → réouvre la fenêtre
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  appendLog('=== Arrêt demandé ===');
});
