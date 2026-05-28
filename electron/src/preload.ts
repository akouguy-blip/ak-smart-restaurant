/**
 * Preload script — pont sécurisé entre le main process et la fenêtre console.
 * Le renderer (console.html) n'a PAS accès directement à Node.js (contextIsolation: true).
 * Il accède aux fonctions ci-dessous via window.akresto.*
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('akresto', {
  // Récupère l'état actuel du serveur (IP, port, statut)
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),

  // Active/désactive le démarrage automatique au boot
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),

  // Ouvre le dossier où vit la base SQLite (utile pour sauvegarde manuelle)
  openDbFolder: () => ipcRenderer.invoke('open-db-folder'),

  // Ouvre le fichier de log (pour debug)
  openLogFile: () => ipcRenderer.invoke('open-log-file'),

  // Ouvre une URL dans le navigateur par défaut
  openUrl: (url: string) => ipcRenderer.invoke('open-url', url),
});
