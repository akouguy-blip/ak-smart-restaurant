# 🚀 Installation AK Smart Restaurant

Guide simple pour installer AK Smart Restaurant sur l'ordinateur du restaurant. Une fois installé, **tous les téléphones et tablettes du restaurant** (cuisine, caisse, gérant, clients) y accèdent en se connectant au WiFi.

> ⏱️ **Temps total : 30 minutes** la première fois. Après c'est 30 secondes pour redémarrer.

---

## 📋 Ce dont tu as besoin

### 1. Un ordinateur dans le restaurant

Pas besoin d'un truc cher. Tout ce qui suit fonctionne :

- Un vieux PC Windows ou Mac de 5-10 ans
- Un mini-PC Intel NUC ou équivalent (≈ 250 000 FCFA en CI)
- N'importe quel laptop branché en permanence

**Spécifications minimum :**
- 4 Go de RAM (8 Go recommandé)
- 20 Go d'espace disque libre
- Windows 10/11, macOS 10.15+, ou Ubuntu 22.04+

### 2. Un routeur WiFi

Le PC doit être connecté au même WiFi que les tablettes/téléphones du staff. Si le restaurant a déjà du WiFi, c'est parfait.

### 3. Une connexion internet (uniquement pour l'installation)

Internet n'est nécessaire **que pour télécharger Docker la première fois**. Après ça, **l'application fonctionne 100% offline** — même si le restaurant perd internet, tout continue de marcher.

### 4. Un onduleur (UPS) — recommandé

Pour éviter de perdre des données en cas de coupure de courant. ≈ 30 000 - 60 000 FCFA pour un modèle 650VA suffisant.

---

## 🪜 Étape 1 — Installer Docker Desktop (une seule fois)

C'est **le seul logiciel** dont tu as besoin sur le PC.

### Sur Windows ou Mac

1. Va sur **https://www.docker.com/products/docker-desktop/**
2. Clique sur "Download for Windows" ou "Download for Mac"
3. Lance l'installeur (le fichier `.exe` ou `.dmg`)
4. Accepte les valeurs par défaut, clique "Suivant" jusqu'à la fin
5. **Redémarre l'ordinateur** quand demandé
6. Lance **Docker Desktop** depuis le menu Démarrer ou Applications
7. **Attends que l'icône 🐳 baleine dans la barre des tâches soit verte**

> ⚠️ Sur Windows, Docker peut te demander d'activer WSL2. Accepte, c'est normal.

### Sur Ubuntu / Linux

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Déconnecte-toi et reconnecte-toi pour appliquer le groupe
```

---

## 🪜 Étape 2 — Récupérer le projet AK Smart Restaurant

Tu as reçu un fichier **`ak-resto-mvp-starter.tar.gz`**. Place-le sur l'ordinateur du restaurant (clé USB, email, WhatsApp web, peu importe).

### Extraire l'archive

**Sur Mac/Linux** — ouvre Terminal :
```bash
cd ~/Downloads
tar -xzf ak-resto-mvp-starter.tar.gz
cd ak-resto
```

**Sur Windows** — clic droit sur le fichier `.tar.gz` → "Extraire tout…" (ou utilise 7-Zip si demandé). Tu obtiens un dossier `ak-resto`.

---

## 🪜 Étape 3 — Lancer l'installation

**Vérifie que Docker Desktop tourne** (icône 🐳 verte). Sinon, lance-le.

### Sur Mac/Linux

Ouvre Terminal dans le dossier `ak-resto/` puis :

```bash
chmod +x install.sh
./install.sh
```

### Sur Windows

**Double-clique sur `install.bat`**.

Si Windows affiche un avertissement de sécurité ("Windows protected your PC"), clique "Informations complémentaires" puis "Exécuter quand même".

---

## ⏳ Ce qui va se passer

Le script va automatiquement :

1. ✅ Vérifier que Docker est installé et démarré
2. ✅ Générer des mots de passe aléatoires uniques pour la sécurité
3. ✅ Télécharger et construire les images Docker (**5 à 10 minutes la première fois**, c'est normal — il télécharge ~500 Mo)
4. ✅ Démarrer la base de données, le backend, et l'interface
5. ✅ Initialiser automatiquement la base avec un restaurant de démo (Chez Aïsha)
6. ✅ Te donner les URLs pour accéder à l'application

À la fin, tu verras quelque chose comme :

```
╔══════════════════════════════════════════════════╗
║         ✓ INSTALLATION TERMINÉE                  ║
╚══════════════════════════════════════════════════╝

🌐 Accès à l'application
   Sur cet ordinateur : http://localhost
   Depuis le WiFi     : http://192.168.1.42

📱 Pour les tablettes/téléphones du restaurant
   Demande-leur d'ouvrir Chrome ou Safari et de taper :
   http://192.168.1.42

🔑 Comptes pré-configurés (à changer plus tard)
   Cuisine    → PIN 1234
   Caisse     → PIN 5678
   Gérant     → PIN 9999
```

**Note bien l'adresse IP affichée** (par ex. `192.168.1.42`). C'est l'adresse que toutes les tablettes et téléphones du restaurant vont utiliser.

---

## 🧪 Test rapide après installation

Ouvre Chrome sur le PC et va sur **http://localhost** — tu dois voir l'écran de bienvenue Chez Aïsha.

Sur ton téléphone (connecté au même WiFi), ouvre Chrome et tape l'IP affichée, par ex. **http://192.168.1.42/t/07** — tu dois voir la table 07.

Test complet en 3 minutes :
1. **Téléphone du client** : http://192.168.1.42/t/07 → passe une commande
2. **Tablette cuisine** : http://192.168.1.42/kitchen → login Chef Aïsha, PIN 1234 → marque "prête"
3. **Tablette caisse** : http://192.168.1.42/caisse → login Aline, PIN 5678 → encaisse

---

## 🛒 Mise en service pour le vrai restaurant

Une fois que ça marche en test, voici ce qu'il reste à faire pour utiliser AK Smart Restaurant dans un vrai restaurant :

### 1. Personnaliser le nom et les infos du restaurant

Pour l'instant, la base contient "Chez Aïsha" en dur. Pour changer :
- Ouvre http://localhost:8080 (Adminer — outil d'inspection de la base) — **note : il faut activer le service adminer dans docker-compose pour cela**
- Système : PostgreSQL, Serveur : `postgres`, Utilisateur : `akresto`, Mot de passe : voir `.env`
- Va dans la table `restaurants` → modifie `nom`, `telephone`, `email`

> 💡 Une future version de l'app aura une page admin pour faire ça en clic. Pour l'instant c'est via Adminer.

### 2. Changer les comptes staff et leurs PINs

Même méthode : table `users`. Modifie les `nom`, `prenom`, `pin_hash`. Pour générer un nouveau `pin_hash` à partir d'un PIN :
```bash
docker compose exec backend node -e "const b=require('bcryptjs'); b.hash('1234',10).then(h=>console.log(h))"
```

### 3. Ajouter tes vrais plats

Connecte-toi en gérant (PIN 9999) → onglet **Menus** → tu peux modifier la disponibilité. Pour ajouter de nouveaux plats avec l'admin web, attends qu'on construise l'écran de création (déjà en partie dans le code).

### 4. Imprimer les QR codes des tables

Connecte-toi en gérant → onglet **Tables · QR** → bouton **Imprimer**. 9 placards par feuille A4. Plastifie-les (n'importe quel reprographe au Plateau, Adjamé, Cocody le fait pour 500 - 1000 F par feuille).

### 5. Pose les QR codes sur les tables

Sur chaque table, colle le placard avec le bon numéro. Le client scanne, et c'est parti.

---

## 🔧 Commandes utiles au quotidien

Toutes ces commandes se lancent depuis le dossier `ak-resto/`.

| Action | Commande |
|---|---|
| Voir si tout tourne | `docker compose ps` |
| Voir les logs en direct | `docker compose logs -f` |
| Voir les logs du backend seulement | `docker compose logs -f backend` |
| Redémarrer après une coupure | `docker compose up -d` |
| Arrêter (données conservées) | `docker compose down` |
| **Tout effacer et recommencer** | `docker compose down -v` |
| Mettre à jour le code | `git pull` puis `docker compose up -d --build` |

---

## 💾 Sauvegarde des données

Les données sont stockées dans un volume Docker. Pour sauvegarder :

```bash
docker compose exec postgres pg_dump -U akresto akresto > backup-$(date +%Y%m%d).sql
```

Mets cette commande dans un cron quotidien ou une tâche planifiée Windows. Copie ensuite le `backup-*.sql` sur un cloud (Google Drive, Dropbox) ou une clé USB.

Pour restaurer :
```bash
cat backup-20260524.sql | docker compose exec -T postgres psql -U akresto -d akresto
```

---

## 🚑 Dépannage

### "Docker is not running"

Lance Docker Desktop, attends que l'icône baleine soit verte, relance le script.

### "Port 80 is already in use"

Un autre logiciel utilise le port 80 (Skype, IIS, autre serveur web). Solutions :

**Option A** : arrête le logiciel qui prend le port 80.

**Option B** : modifie `.env` pour utiliser un autre port :
```
HTTP_PORT=8080
```
Puis :
```bash
docker compose down
docker compose up -d
```
Tu accèdes ensuite via `http://192.168.1.42:8080`.

### Les téléphones ne voient pas l'app

1. Vérifie qu'ils sont **bien sur le même WiFi** que le PC
2. Sur le PC, vérifie l'IP réelle : `ipconfig` (Windows) ou `ifconfig` (Mac)
3. Désactive temporairement le **pare-feu Windows** pour tester
4. Si tu utilises Windows : autorise Docker dans le pare-feu (Panneau de configuration → Pare-feu Windows Defender → Autoriser une application)

### La cuisine ne reçoit pas les commandes en temps réel

Les WebSocket sont parfois bloqués par certains routeurs ou proxies. Vérifie :
- Pas de "Captive Portal" sur le WiFi (le routeur n'intercepte pas les connexions)
- Le navigateur de la tablette n'a pas une extension qui bloque les WS

### J'ai cassé la base de données

```bash
docker compose down -v
docker compose up -d
```

La base est recréée vide et re-seedée avec Chez Aïsha. Tu perds toutes les données mais tu repars de zéro proprement.

### "Build failed" pendant l'installation

Capture l'erreur exacte et envoie-la moi. Souvent c'est :
- Pas assez d'espace disque (vérifie avec `df -h`)
- Image Docker corrompue (lance `docker system prune -a` puis relance)

---

## 🌐 Bonus — Exposer l'app sur internet (optionnel)

Si tu veux que **le gérant puisse consulter les stats depuis chez lui** sans être au restaurant, tu as deux options :

### Option A — Tunnel sécurisé (gratuit, 5 minutes)

Installe **Cloudflare Tunnel** sur le PC du restaurant :
```bash
docker run -d cloudflare/cloudflared tunnel --url http://localhost
```

Cloudflare te donne une URL `https://random-name.trycloudflare.com` accessible depuis n'importe où. Aucune config réseau, aucune ouverture de port.

### Option B — Sous-domaine permanent

Si tu as un nom de domaine (`monresto.ci`), tu peux :
- Soit louer un petit VPS et y faire tourner le même Docker stack
- Soit utiliser Cloudflare Tunnel avec un domaine personnalisé

Détails à voir plus tard quand tu seras prêt.

---

## 📞 Support

Si tu bloques, capture :
- Le système d'exploitation (Windows 10/11, Mac, Ubuntu)
- L'erreur exacte (texte ou screenshot du terminal)
- Le contenu de `docker compose logs --tail=50`

Et reviens vers moi. Je débloque.

**Bon démarrage ! 🚀**
