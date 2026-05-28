# 🌐 Mettre AK Smart Restaurant en ligne (cloud)

Guide **pas-à-pas** pour avoir une vraie URL `https://...` accessible depuis n'importe quel téléphone / ordinateur, sans rien installer chez le restaurateur.

> ⏱️ **Temps total : 20-30 minutes** la première fois.
> 💸 **Coût : GRATUIT** pendant les premiers mois (crédit offert), puis ~5 $ / mois (≈ 3 000 FCFA).

---

## 📋 Vue d'ensemble

Tu vas faire 3 choses :

1. **Créer un compte GitHub** (15 sec si tu en as déjà un)
2. **Y déposer le code** (5 minutes)
3. **Connecter Railway** qui transforme le code en application en ligne (10 minutes)

À la fin, tu auras une URL du genre `https://ak-resto-production-xxxx.up.railway.app` que tu pourras envoyer par WhatsApp.

---

## 🪜 PARTIE 1 — Mettre le code sur GitHub

GitHub, c'est un peu comme Google Drive mais pour le code. Railway le lit depuis là pour construire l'application.

### Étape 1.1 — Créer un compte GitHub

1. Va sur **https://github.com/signup**
2. Entre ton email, choisis un mot de passe, choisis un nom d'utilisateur (par exemple `ak-resto-ci`)
3. Vérifie ton email (clique sur le lien reçu)
4. Tu arrives sur ton dashboard GitHub

> Si tu as déjà un compte → connecte-toi sur **https://github.com/login**

### Étape 1.2 — Créer un nouveau "repository" (dépôt)

1. En haut à droite de GitHub, clique sur le **+** → **"New repository"**
2. Remplis :
   - **Repository name** : `ak-smart-restaurant`
   - **Description** : `Système de gestion de restaurant` (optionnel)
   - Coche **"Public"** (sinon Railway gratuit ne marche pas avec un repo privé)
   - **NE COCHE PAS** "Add a README file", "Add .gitignore", "Choose a license" (laisse vide pour éviter les conflits)
3. Clique **"Create repository"**

Tu arrives sur une page qui dit "Quick setup — if you've done this kind of thing before". **Ignore les commandes git** affichées au milieu de la page.

### Étape 1.3 — Téléverser les fichiers

Sur la même page, il y a un lien **"uploading an existing file"** (au milieu de la page, dans la section avec les commandes git). Clique dessus.

OU va directement à : `https://github.com/TON_USERNAME/ak-smart-restaurant/upload/main`

Maintenant :

1. **Extrais** le fichier `ak-resto-mvp-starter.tar.gz` que je t'ai donné
   - Sur Windows : clic droit → "Extraire tout"
   - Sur Mac : double-clique
   - Tu obtiens un dossier `ak-resto`
2. **Ouvre** le dossier `ak-resto`
3. **Sélectionne TOUT son contenu** (Ctrl+A sur Windows, Cmd+A sur Mac)
   - Sélectionne les fichiers ET les sous-dossiers (`backend`, `frontend`, etc.)
   - **Ne sélectionne PAS** le dossier `ak-resto` lui-même, mais bien son contenu
4. **Glisse-dépose** la sélection dans la zone GitHub qui dit "Drag files here to add them"
5. Attends que tous les fichiers se chargent (barre de progression, 1-2 minutes)
6. En bas, dans la case **"Commit changes"** :
   - Premier champ : laisse `Add files via upload` ou écris `Initial commit`
   - Sélectionne **"Commit directly to the `main` branch"**
7. Clique **"Commit changes"**

🎉 Tu vois maintenant tous tes fichiers (`backend/`, `frontend/`, `Dockerfile`, etc.) listés dans GitHub.

> **Problème de drag & drop trop lent ?** Alternative : télécharge **GitHub Desktop** (https://desktop.github.com/) — c'est un logiciel gratuit qui fait l'upload à ta place. Tu fais "Clone repository", tu copies les fichiers dans le dossier cloné, tu cliques "Commit" puis "Push". Pas besoin de terminal.

---

## 🪜 PARTIE 2 — Déployer sur Railway

Railway, c'est le service qui transforme ton code en application en ligne.

### Étape 2.1 — Créer un compte Railway

1. Va sur **https://railway.app**
2. Clique sur **"Login"** en haut à droite
3. Clique sur **"Login with GitHub"** (c'est le plus simple, vu que tu as déjà un compte GitHub)
4. Autorise Railway à accéder à GitHub (clique "Authorize railwayapp")

Tu arrives sur ton dashboard Railway, vide.

### Étape 2.2 — Créer un nouveau projet

1. Clique sur **"New Project"** (gros bouton violet/rose en haut)
2. Choisis **"Deploy from GitHub repo"**
3. Si demandé, autorise Railway à voir tes repositories GitHub
4. **Cherche et sélectionne** `ak-smart-restaurant` dans la liste
5. Clique dessus

Railway commence automatiquement à construire ton application en utilisant le `Dockerfile` à la racine du projet. **Attends 3 à 6 minutes** que ça compile (tu verras la progression dans l'onglet "Deployments" → clique sur le dernier déploiement pour voir les logs en direct).

### Étape 2.3 — Ajouter la base de données PostgreSQL

L'application a besoin d'une base de données. Railway en fournit une gratuitement.

1. Dans ton projet Railway, clique sur **"+ New"** (en haut)
2. Choisis **"Database"** → **"Add PostgreSQL"**
3. PostgreSQL démarre en 10 secondes — il apparaît comme une nouvelle "tuile" à côté de ton app

### Étape 2.4 — Connecter la base à l'application

Maintenant il faut dire à ton app où trouver la base de données.

1. Clique sur la tuile **"ak-smart-restaurant"** (ton application, pas Postgres)
2. Va dans l'onglet **"Variables"** (en haut)
3. Clique **"+ New Variable"**
4. Dans le champ "Variable Name", tape : `DATABASE_URL`
5. Dans le champ "Value", clique sur le petit bouton **"Add Reference"** (icône `{X}`)
6. Sélectionne **Postgres → DATABASE_URL**
7. Clique **"Add"**

Tu as maintenant `DATABASE_URL = ${{Postgres.DATABASE_URL}}` dans tes variables. ✅

### Étape 2.5 — Ajouter le secret JWT

Toujours dans **Variables** :

1. Clique **"+ New Variable"** à nouveau
2. Nom : `JWT_SECRET`
3. Valeur : tape n'importe quelle longue suite de caractères aléatoires, par exemple :
   ```
   ak_resto_a8f3k29sl0d8fjsl3kdj29sk30skd92lskd
   ```
   (mélange chiffres et lettres, environ 40 caractères)
4. Clique **"Add"**

### Étape 2.6 — Exposer l'application sur internet

Par défaut, Railway construit ton app mais ne lui donne pas d'adresse publique.

1. Dans la tuile de ton app, clique sur l'onglet **"Settings"**
2. Scrolle jusqu'à la section **"Networking"**
3. Clique **"Generate Domain"**

Railway te génère une URL comme `ak-smart-restaurant-production-a8b2.up.railway.app`. ✅

### Étape 2.7 — Attendre le redéploiement

Chaque fois que tu modifies une variable ou un paramètre, Railway redéploie automatiquement. Attends 2-3 minutes que le déploiement soit terminé.

Tu peux suivre la progression dans l'onglet **"Deployments"** — quand tu vois ✅ et "Active", c'est prêt.

---

## 🎉 PARTIE 3 — Tester l'application

### Étape 3.1 — Ouvrir l'application

Clique sur l'URL qui s'affiche sous "Networking" — quelque chose comme :
```
https://ak-smart-restaurant-production-a8b2.up.railway.app
```

Tu dois voir la page d'accueil **"Bienvenue chez Aïsha"**.

### Étape 3.2 — Test complet

Sur ton téléphone ou un autre ordinateur :

| URL | Login |
|---|---|
| `[URL]/t/07` | (aucun — c'est l'écran client) |
| `[URL]/kitchen` | Chef Aïsha, PIN **1234** |
| `[URL]/caisse` | Aline Konan, PIN **5678** |
| `[URL]/admin` | Yacouba Touré, PIN **9999** |

Le même test qu'en local : passe une commande, vois-la apparaître en cuisine, marque-la prête, encaisse-la, regarde les stats admin. ✅

### Étape 3.3 — Partager le lien

Tu peux maintenant envoyer ce lien par WhatsApp à n'importe quel restaurateur. Il l'ouvre dans Chrome ou Safari, et c'est l'app — sans rien installer.

Sur leur téléphone, dans Chrome :
- **Menu (⋮)** → **"Ajouter à l'écran d'accueil"** → l'app apparaît comme une vraie app

---

## 💰 Combien ça coûte ?

### Railway

- **Crédit gratuit** : 5 $ / mois (généralement suffisant pour un petit restaurant les premiers mois)
- **Au-delà** : pay-as-you-go, environ **3-7 $ / mois** (≈ 2 000 - 4 000 FCFA) pour un restaurant actif
- Pour payer : carte VISA / Mastercard (ECOBANK, NSIA, SGBCI, BICICI, etc. en émettent)

### Si tu n'as pas de carte / pour rester 100% gratuit

Tu peux utiliser **Render.com** (alternative à Railway) qui a un tier vraiment gratuit :
- ✅ Gratuit illimité
- ❌ L'app "s'endort" après 15 min d'inactivité — la première requête après prend 30-60 secondes
- Acceptable pour une démo, problématique pour un restaurant en service

Pour Render, le process est très similaire : tu connectes ton GitHub, tu déploies, tu ajoutes PostgreSQL. La logique est la même.

---

## 🆘 Dépannage

### "Build failed" pendant le déploiement

1. Va dans l'onglet **Deployments** → clique sur le déploiement raté → onglet **Build logs**
2. Cherche le mot **ERROR** ou **failed**
3. Si tu vois "no space left on device" → Railway a un souci temporaire, relance avec **"Redeploy"**
4. Si tu vois "Cannot find module xxx" → manque une dépendance — envoie-moi le message exact

### L'app charge mais affiche une erreur 502 / 504

1. Va dans l'onglet **Deploy logs** de ton app
2. Cherche un message d'erreur
3. Vérifie que **DATABASE_URL** est bien définie dans Variables
4. Vérifie que **JWT_SECRET** est bien définie

### Je ne vois pas les commandes en cuisine en temps réel

Les WebSocket fonctionnent sur Railway. Si ça ne marche pas :
1. Ouvre la console développeur du navigateur (F12) → onglet "Console"
2. Cherche les erreurs en rouge
3. Envoie-moi un screenshot

### J'ai changé du code, comment redéployer ?

Sur GitHub :
1. Va dans ton repo `ak-smart-restaurant`
2. Trouve le fichier modifié
3. Clique sur le crayon (✏️) en haut à droite
4. Modifie, scroll en bas, clique **"Commit changes"**

Railway détecte le push GitHub automatiquement et redéploie. ✅

### Je veux un nom de domaine perso (akresto.ci)

1. Achète le domaine chez un registrar (Namecheap, OVH, ou un registrar ivoirien comme NIC.ci)
2. Dans Railway → Settings → Networking → **"Add Custom Domain"**
3. Suis les instructions pour configurer le DNS

---

## 📈 Et après ?

Une fois ton app en ligne, tu peux :

1. **Démarcher des restaurants** en leur montrant l'URL → c'est ton meilleur argument commercial
2. **Créer une URL par restaurant** : il suffit de redéployer le code avec un autre nom de projet Railway et une autre base de données
3. **Faire évoluer l'app** : intégration paiement réelle, module fidélité, etc.

Quand tu auras 5+ restaurants, on parlera de :
- Multi-tenant (un seul backend qui gère plusieurs restaurants)
- Sous-domaines automatiques (`chezaisha.akresto.ci`)
- Tableau de bord super-admin pour toi
- Facturation automatique

---

## 📞 Si tu bloques

Capture l'écran (ou copie le message d'erreur) et reviens vers moi. Les blocages classiques en moins de 5 minutes :

- "Je ne sais pas où cliquer dans Railway"
- "Le build a échoué avec ce message : ..."
- "L'app charge mais une page blanche apparaît"

Bon déploiement ! 🚀
