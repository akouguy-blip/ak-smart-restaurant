# AK Smart Restaurant — Wrapper Electron

Ce dossier transforme l'application web (backend NestJS + frontend Vue) en **vrai logiciel Windows / Mac** installable.

## 🎯 Ce que ça fait

À l'exécution, l'application :

1. Démarre le backend NestJS **dans le même processus** (pas de console qui s'affiche)
2. Ouvre une **fenêtre Windows native** ("Console serveur") qui montre :
   - Le statut du serveur (vert / orange / rouge)
   - Les **URLs à donner aux tablettes** du staff (basé sur l'IP locale)
   - Les actions admin : ouvrir le dossier de la base, voir les logs, démarrer au boot
3. Crée une **icône près de l'horloge Windows** (system tray) :
   - Clic droit → menu rapide (ouvrir l'app, démarrer au boot, quitter)
   - Double-clic → réouvre la fenêtre console
4. La base SQLite est stockée dans `%APPDATA%\AK Smart Restaurant\akresto.db` (Windows) ou `~/Library/Application Support/AK Smart Restaurant/akresto.db` (Mac)

## 📁 Structure

```
electron/
├── package.json              # Config Electron + electron-builder
├── tsconfig.json             # Compile TS pour le main process
├── src/
│   ├── main.ts               # Processus principal (démarre NestJS + crée fenêtre + tray)
│   ├── preload.ts            # Pont sécurisé main ↔ console (contextBridge)
│   └── console.html          # Interface "console serveur" (UI dark/gold)
├── scripts/
│   └── copy-assets.js        # Copie console.html dans dist/ après tsc
└── build-resources/
    ├── icon.png              # Icône principale 512x512
    ├── icon.ico              # Icône Windows (multi-résolutions, pour .exe)
    └── tray-icon.png         # Icône system tray 32x32
```

## 🛠️ Workflow de développement (sur ta machine locale)

**Prérequis** : Node.js 20+ installé.

```bash
# Une fois : installer les deps du backend, frontend et electron
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd electron && npm install && cd ..

# Build tout
cd electron
npm run build:all  # compile backend + frontend + electron

# Lancer l'app en dev (ouvre la fenêtre Electron)
npm run dev
```

## 📦 Production — construire le .exe

Pour produire le fichier `AK Smart Restaurant Setup 1.0.0.exe` distribuable :

```bash
cd electron
npm run dist:win    # Windows .exe (NSIS installer)
# OU
npm run dist:mac    # Mac .dmg
```

Le fichier se trouve dans `electron/release/`.

> ⚠️ **Tu n'as PAS besoin de faire ça toi-même.** En Session 3, on configure **GitHub Actions** pour que ces builds se fassent automatiquement dans le cloud à chaque push. Tu télécharges juste le .exe final.

## 🔌 Comment ça communique

```
┌──────────────────────────────────────────────────────────────┐
│                  Electron App (process Node)                 │
│                                                              │
│   ┌─────────────────────┐    ┌────────────────────────┐    │
│   │  Main process       │    │ Backend NestJS         │    │
│   │  (main.ts)          │    │ (importé via require)  │    │
│   │  • Crée fenêtre     │◄───┤ • Sert /api sur :3838  │    │
│   │  • Crée tray        │    │ • Sert /socket.io      │    │
│   │  • Lit IP locale    │    │ • Sert /assets (Vue)   │    │
│   └─────────┬───────────┘    │ • SQLite local         │    │
│             │ IPC             └────────────────────────┘    │
│   ┌─────────▼───────────┐                                   │
│   │  Console serveur    │                                   │
│   │  (console.html)     │                                   │
│   │  • Statut, IP, logs │                                   │
│   └─────────────────────┘                                   │
└──────────────────────────────────────────────────────────────┘
                    │
                    │ WiFi
                    ▼
┌──────────────────────────────────────────────────────────────┐
│  Tablettes / Téléphones du restaurant                        │
│  • Navigateur sur http://192.168.X.X:3838                   │
│  • Cuisine, caisse, clients tous via cette URL              │
└──────────────────────────────────────────────────────────────┘
```

## 🐛 Dépannage

### "Cannot find module 'better-sqlite3'" au lancement

`better-sqlite3` est un module natif C++ qui doit être recompilé pour Electron (qui utilise sa propre version de Node).

**Solution** : après `npm install`, lance :
```bash
npx electron-rebuild
```

Le `postinstall` script le fait normalement automatiquement, mais en cas de bug :
```bash
cd electron
./node_modules/.bin/electron-builder install-app-deps
```

### La fenêtre s'ouvre mais le serveur reste en "Démarrage…"

Le backend n'a pas réussi à démarrer. Vérifie :
1. Que la base SQLite a les bonnes permissions d'écriture
2. Que le port 3838 n'est pas déjà utilisé par autre chose
3. Les logs dans `%APPDATA%\AK Smart Restaurant\app.log`

### Les tablettes du staff ne voient pas l'URL

1. Vérifie qu'elles sont sur le **même WiFi** que l'ordinateur serveur
2. Sur l'ordinateur serveur, désactive temporairement le pare-feu Windows
3. Si ça marche sans pare-feu, ajoute une règle pour autoriser le port 3838

## 🔮 Prochaines étapes

- **Session 3** : Configuration GitHub Actions pour build automatique du .exe
- **Session 4** : Tests, peaufinage UI, guide d'installation imprimable pour le restaurateur
