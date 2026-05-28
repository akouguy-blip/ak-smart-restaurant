# 🤖 Comment utiliser GitHub Actions pour build l'app

Guide pratique pour produire le fichier `AK Smart Restaurant Setup.exe` **sans jamais installer Node.js sur ton ordinateur**. GitHub fait tout le travail pour toi gratuitement.

> ⚡ **Une fois configuré, ton workflow devient** : tu fais une modification → tu pousses sur GitHub → 5-10 min plus tard → le `.exe` est prêt à télécharger.

---

## 📋 Vue d'ensemble

Voici ce que tu vas faire (une seule fois) :

1. **Créer un compte GitHub** (5 min, si pas déjà fait)
2. **Pousser le code sur GitHub** (10 min)
3. **Attendre le premier build automatique** (10-15 min — GitHub bosse)
4. **Télécharger le `.exe` produit** (1 min)

Total : environ **30 minutes** la première fois.

Après ça, **toute modif** (changer un prix, ajouter un plat, etc.) prendra 5-10 min pour redonner un nouveau `.exe`.

---

## 🪜 PHASE 1 — Mettre le code sur GitHub

### Étape 1.1 — Créer un compte GitHub (si pas déjà)

1. Va sur **https://github.com/signup**
2. Email + mot de passe + nom d'utilisateur (par ex. `ak-resto-ci`)
3. Vérifie ton email

### Étape 1.2 — Créer un nouveau repository

1. En haut à droite de GitHub : clique sur **`+`** → **"New repository"**
2. Remplis :
   - **Repository name** : `ak-smart-restaurant`
   - **Description** : (optionnel)
   - Coche **"Public"** (pour avoir GitHub Actions gratuit illimité)
   - **NE COCHE PAS** "Add a README file", ".gitignore", ou "license"
3. Clique **"Create repository"**

### Étape 1.3 — Téléverser le code

Sur la page qui s'affiche, cherche le lien **"uploading an existing file"** (au milieu, dans la section avec les commandes git).

Ou va directement à :
```
https://github.com/TON_USERNAME/ak-smart-restaurant/upload/main
```

Maintenant :

1. **Extrais** le fichier `ak-resto-mvp-starter.tar.gz`
2. Ouvre le dossier `ak-resto`
3. **Sélectionne TOUT son contenu** (Ctrl+A) — TOUS les fichiers ET les sous-dossiers, **y compris le dossier caché `.github`**

> ⚠️ **Sur Windows** : par défaut, les dossiers commençant par `.` (comme `.github`, `.gitignore`) sont cachés. Pour les voir :
> Explorateur → onglet **"Affichage"** → coche **"Éléments masqués"**.
>
> **Le dossier `.github` est CRUCIAL** — c'est lui qui contient les workflows. Sans lui, GitHub ne saura pas construire ton .exe.

4. **Glisse-dépose** la sélection dans la zone GitHub "Drag files here"
5. Attends que tout se charge (2-5 minutes pour 100+ fichiers)
6. En bas : **"Commit changes"** → **"Commit directly to the main branch"** → clique **"Commit changes"**

### Étape 1.4 — Vérifier que les workflows sont bien là

Sur la page de ton repo, clique sur l'onglet **"Actions"** en haut.

Tu dois voir **"Build AK Smart Restaurant"** et **"Tests rapides"** dans la liste à gauche.

Si tu ne vois **rien** → le dossier `.github` n'a pas été uploadé. Retourne à l'étape précédente et réessaye en t'assurant qu'il est bien sélectionné.

---

## 🚀 PHASE 2 — Lancer le premier build

### Étape 2.1 — Vérifier que le build s'est déclenché

Dès que tu as commit ton code, GitHub a normalement déclenché automatiquement le premier build.

Va sur l'onglet **"Actions"** de ton repo. Tu vois en haut :

```
⏳ Build AK Smart Restaurant   (en cours...)
```

Clique dessus pour voir le détail.

### Étape 2.2 — Comprendre ce que GitHub fait

GitHub a démarré une **machine virtuelle Windows** gratuite et exécute les étapes une par une :

| Étape | Durée | Quoi |
|---|---|---|
| Checkout repo | 5 sec | Télécharger ton code |
| Setup Node.js | 10 sec | Installer Node 20 |
| Install backend deps | 1-2 min | `npm install` du backend |
| Install frontend deps | 1-2 min | `npm install` du frontend |
| Install electron deps | 2-3 min | `npm install` d'Electron (gros) |
| Build backend | 30 sec | Compiler le code TypeScript |
| Build frontend | 1 min | Compiler la PWA Vue |
| Build Electron | 5 sec | Compiler le wrapper |
| **Package Windows .exe** | **3-5 min** | **Créer l'installeur** |
| Upload artifact | 30 sec | Mettre le .exe à disposition |

**Total premier build : 10-15 min.** Builds suivants : 4-6 min (grâce au cache).

### Étape 2.3 — Quand le build est terminé ✓

Quand tu vois le **✓ vert** à côté de "Build AK Smart Restaurant", c'est que ça a réussi.

Si tu vois ❌ rouge → quelque chose a échoué. Clique dessus pour voir où, capture l'erreur et envoie-la moi.

---

## 📥 PHASE 3 — Télécharger le `.exe`

### Étape 3.1 — Aller à la page du build

Sur l'onglet **Actions** → clique sur le build réussi (le plus récent en haut).

### Étape 3.2 — Télécharger l'artifact

Scroll en bas de la page jusqu'à voir la section **"Artifacts"**.

Tu vois quelque chose comme :

```
📦 ak-resto-windows-installer       95 MB
📦 ak-resto-mac-installer           87 MB     (si Mac a réussi)
```

**Clique sur le nom** → ça télécharge un fichier ZIP.

### Étape 3.3 — Extraire le ZIP

1. Va dans tes Téléchargements
2. Clic droit sur `ak-resto-windows-installer.zip` → **"Extraire tout..."**
3. Dans le dossier extrait, tu trouves :
   ```
   AK Smart Restaurant Setup 1.0.0.exe    (~ 90 MB)
   AK Smart Restaurant Setup 1.0.0.exe.blockmap  (petit fichier auxiliaire)
   ```

🎉 **Le `.exe` est prêt.** Tu peux le copier sur clé USB, l'envoyer par WhatsApp Business, ou le mettre à disposition.

---

## 🏷️ PHASE 4 — Faire une "release" officielle (recommandé)

Au lieu de juste télécharger l'artifact à chaque fois, tu peux créer une **release** publique GitHub. Avantage : une URL stable que tu peux partager avec n'importe qui.

### Comment ça marche

Quand tu pousses un **tag git** qui commence par `v` (comme `v1.0.0`), GitHub Actions :
1. Construit le `.exe` ET le `.dmg`
2. **Crée automatiquement une release** publique sur ton repo
3. Y attache les fichiers téléchargeables

### Comment créer un tag depuis GitHub (sans terminal)

1. Va sur ton repo GitHub
2. Onglet **"Releases"** (à droite, sous "About") → **"Create a new release"**
3. Champ "Choose a tag" → tape `v1.0.0` → **"Create new tag: v1.0.0 on publish"**
4. Titre : `v1.0.0` (ou plus parlant : "Première version")
5. Description : ce qui change dans cette version (optionnel)
6. **Coche "Set as a pre-release"** la première fois pour pouvoir tester sans pression
7. Clique **"Publish release"**

GitHub Actions va automatiquement détecter le tag, lancer un build, et attacher le `.exe` à cette release dans ~10 minutes.

Une fois terminé, tu auras une URL du genre :

```
https://github.com/TON_USERNAME/ak-smart-restaurant/releases/tag/v1.0.0
```

**N'importe qui ouvrant cette URL peut télécharger ton installeur**. Tu peux l'envoyer par email, WhatsApp, l'imprimer sur ta carte de visite.

---

## 🔄 Workflow quotidien (après installation initiale)

Une fois que tout est configuré :

| Quoi tu veux faire | Comment |
|---|---|
| Ajouter un plat au menu démo | Modifier `backend/db/init.sqlite.sql` sur GitHub (crayon ✏️ en haut à droite du fichier) → Commit |
| Changer le nom du resto démo | Pareil, dans `init.sqlite.sql` |
| Changer le design (couleurs, polices) | Modifier `frontend/tailwind.config.js` |
| Sortir une nouvelle version pour ton client | Créer un nouveau tag (Releases → Create new release → v1.0.1) |

À chaque commit, GitHub Actions construit un nouveau `.exe` automatiquement. Tu n'as JAMAIS besoin d'installer Node.js ou compiler quoi que ce soit en local.

---

## 💡 Astuces

### Voir les logs en temps réel

Pendant qu'un build tourne, clique dessus pour voir les logs en direct. Si quelque chose foire, tu vois ce qui se passe.

### Re-déclencher un build manuellement

Onglet **Actions** → "Build AK Smart Restaurant" (gauche) → bouton **"Run workflow"** (à droite) → choisis la branche `main` → **"Run workflow"**.

### Économiser des minutes GitHub

GitHub donne 2 000 minutes/mois gratuites en repo privé, illimité en repo public.

Notre `test.yml` est ultra léger (3 min/build), `build.yml` plus lourd (15 min). À 2-3 builds/jour, tu restes large dans le quota.

### Si tu veux mettre ton code en privé

Repo privé → 2000 min/mois de GitHub Actions gratuit. Suffisant pour ~10-15 builds Windows complets/mois. Au-delà : $0.008/min sur Windows (= ~ 70 FCFA/min).

---

## 🆘 Dépannage

### "Build failed - Cannot find module 'better-sqlite3'"

Le module natif n'a pas été recompilé pour Electron.

→ Dans le workflow, vérifie que `electron/package.json` a bien le `postinstall: "electron-builder install-app-deps"`.

### "Error: The process '/usr/bin/git' failed with exit code 128"

GitHub Actions n'arrive pas à push la release. Vérifie dans **Settings → Actions → General** → "Workflow permissions" → coche **"Read and write permissions"**.

### Le build prend 30+ minutes

C'est anormal — probablement un cache miss. Va dans **Settings → Actions → Caches** et vérifie qu'il y a des entrées. Si pas → premier build sans cache, normal.

### "No space left on device" sur le runner

Très rare. Re-déclenche le workflow, GitHub te file une nouvelle VM.

---

## ✅ Récap des fichiers créés

| Fichier | Rôle |
|---|---|
| `.github/workflows/build.yml` | Build complet Windows + Mac + release auto |
| `.github/workflows/test.yml` | Vérification rapide TypeScript à chaque push |

Tous les deux sont déjà dans le tarball que je t'ai donné. Ils se déclenchent **automatiquement** dès que tu pousses le code sur GitHub.

---

## 🎯 Ton action maintenant

1. Va sur **https://github.com/signup** si tu n'as pas de compte
2. Crée un repo **public** appelé `ak-smart-restaurant`
3. Upload **tout** le contenu du dossier `ak-resto/` (y compris le dossier caché `.github/` !!!)
4. Va dans l'onglet **Actions** → attends que le build se termine (10-15 min)
5. Télécharge le `.exe` depuis la section **"Artifacts"** en bas du build
6. **Reviens me dire** : "Ça marche !" avec le lien de ta release, ou "Erreur à l'étape X" avec un screenshot

Une fois que tu as un `.exe` qui s'installe correctement sur un PC, on attaque la **Session 4** : peaufinage UI, guide d'installation imprimable pour ton restaurateur, et préparation à la livraison.
