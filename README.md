# AK Smart Restaurant — MVP Starter

Code de démarrage pour AK Smart Restaurant : système de commande par QR pour restaurants ivoiriens.

## Stack

- **Backend** : NestJS 10 + TypeScript + PostgreSQL 16 + Socket.io
- **Frontend** : Vue 3 + Vite + TypeScript + Tailwind CSS + Workbox (PWA)
- **DB** : seedée avec un restaurant ivoirien fictif ("Chez Aïsha") et 19 plats authentiques

## Prérequis

- Node.js 20+ (`node --version`)
- Docker + Docker Compose
- Git

## Démarrage rapide (3 minutes)

```bash
# 1. Variables d'environnement
cp .env.example .env

# 2. Démarrer PostgreSQL + Redis + Adminer
docker compose up -d

# 3. Backend (terminal 1)
cd backend
npm install
npm run db:init      # crée le schéma et les données seed
npm run dev          # http://localhost:3000

# 4. Frontend (terminal 2)
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Ouvre **http://localhost:5173/t/07** pour simuler le scan du QR de la table 7.

## Ce qui marche

✅ Schéma DB complet (restaurants, tables, zones, menus, commandes, items, users, payments)  
✅ Seed avec **Chez Aïsha**, 9 tables, 19 plats (Poulet Kedjenou, Capitaine grillé, Attiéké poisson, Bissap…)  
✅ API menu publique signée par QR HMAC (`GET /api/menu/public/:tableNumero`)  
✅ API création de commande avec calcul TVA (`POST /api/orders`)  
✅ API transition de statut **protégée par JWT** (`PATCH /api/orders/:id/status`)  
✅ **API d'encaissement** transactionnelle (`POST /api/payments`)  
✅ **API admin** : tables/QR, stats du jour avec delta vs hier, CRUD menu complet  
✅ **Authentification staff** par PIN (JWT 8h, bcrypt, rôles cuisine/caisse/gerant/admin)  
✅ Création automatique des comptes de démo au démarrage  
✅ WebSocket Socket.io qui pousse `order:new` et `order:update` en temps réel  
✅ Frontend Vue 3 PWA installable (manifest + service worker)  
✅ **Tableau de bord cuisine** (`/kitchen`) avec Kanban temps réel  
✅ **Tableau de bord caisse** (`/caisse`) avec encaissement transactionnel  
✅ **Admin · Aperçu** (`/admin/dashboard`) : 4 KPIs avec delta vs hier, graphique horaire, top plats, modes de paiement  
✅ **Admin · Menus** (`/admin/menus`) : CRUD plats + catégories, toggle dispo en un clic, gestion des erreurs FK  
✅ **Admin · Tables &amp; QR** (`/admin/tables`) : grille imprimable A4 + régénération secret  
✅ **Login staff** (`/staff/login`) avec picker + pavé numérique + auto-redirect par rôle  
✅ Layout admin partagé avec nav tabs (Aperçu / Menus / Tables)  
✅ Cache offline du menu (IndexedDB via Dexie + Workbox)  
✅ Panier persistant (Pinia)  
✅ Design dark/gold cohérent avec les maquettes

## Structure

```
ak-resto/
├── README.md
├── docker-compose.yml          # Postgres 16 + Redis 7 + Adminer
├── .env.example
├── backend/                    # NestJS API + WebSocket
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── database.module.ts  # Pool pg partagé
│   │   ├── auth/               # JWT, PIN, guards, decorators
│   │   ├── menu/               # endpoint menu public
│   │   ├── orders/             # création commande + Socket.io
│   │   ├── payments/           # encaissement transactionnel
│   │   └── admin/              # tables + génération QR signé
│   └── db/init.sql             # schéma + seed Ivorian
└── frontend/                   # Vue 3 PWA
    └── src/
        ├── views/              # Welcome, Menu, Cart, OrderTracking, Kitchen, Caisse,
        │                        # AdminDashboard, MenuAdmin, TablesQR, StaffLogin
        ├── components/         # AdminLayout (header + nav tabs partagés)
        ├── stores/             # cart.ts, auth.ts (Pinia)
        ├── db.ts               # Dexie (cache offline)
        └── api.ts              # Axios + JWT interceptor
```

> **Note importante** : ce build ajoute la table `payments` au schéma. Si tu mets à jour depuis une version précédente, relance `npm run db:init` côté backend pour recréer le schéma (cela efface les données de démo, le re-seed est immédiat).

## Tester la chaîne complète

Avec trois onglets (ou téléphone + 2 onglets PC), tu peux voir le flow temps réel de bout en bout :

**Onglet 1 — côté client** (sur ton téléphone idéalement)
1. Ouvre http://localhost:5173/t/07
2. Ajoute Poulet Kedjenou + Bissap au panier
3. Valide la commande → tu arrives sur l'écran de suivi

**Onglet 2 — côté cuisine**
1. Ouvre http://localhost:5173/kitchen
2. Redirigé vers `/staff/login` → choisis Chef Aïsha, PIN **1234**
3. La commande apparaît instantanément
4. "Démarrer la cuisson" → "Marquer prête"

**Onglet 3 — côté caisse**
1. Ouvre http://localhost:5173/caisse
2. Login Aline Konan, PIN **5678**
3. La commande apparaît dans la liste à encaisser
4. Clique dessus → tu vois le ticket complet
5. "Marquer comme servie" (transition prête → servie)
6. Choisis "Wave" comme mode de paiement
7. Clique "Encaisser X F · Wave"
8. Toast vert "Commande #1241 encaissée"
9. La commande disparaît de la liste, l'onglet client voit "Payée · merci de votre visite"

Sur l'onglet 1 (client), le suivi montre tout en temps réel : Reçue → En cuisine → Prête → Servie → Payée.

### Comptes de démo

| Profil | Rôle | PIN | Redirige vers |
|---|---|---|---|
| Chef Aïsha | cuisine | **1234** | /kitchen |
| Aline Konan | caisse | **5678** | /caisse |
| Yacouba Touré | gérant | **9999** | /admin/dashboard |

Les PINs sont hashés avec bcrypt en base. Le JWT a une durée de 8h (durée d'un service).

### Espace gérant

Connecte-toi en tant que **Yacouba Touré** (PIN 9999). Tu arrives sur `/admin/dashboard` avec trois onglets :

**1. Aperçu** (`/admin/dashboard`)
- 4 KPIs : CA, transactions, ticket moyen, plats vendus — chacun avec **delta vs hier**
- Graphique du CA par heure avec **pic mis en évidence en doré**
- Top 5 plats par revenu généré (barres relatives)
- Répartition par mode de paiement (Wave, Orange, MTN, Carte, Espèces)

Pour voir des chiffres, encaisse quelques commandes via `/caisse` avec Aline Konan d'abord, sinon le dashboard sera vide (normal — pas encore de ventes).

**2. Menus** (`/admin/menus`)
- Onglets de catégories avec compteur de plats
- Toggle disponibilité en un clic (slider doré)
- Modifier un plat → expand inline avec formulaire (nom, description, prix, catégorie, temps prep, ★ vedette)
- Supprimer → bloqué automatiquement si le plat a déjà été commandé (FK violation gérée proprement)
- Bouton **+ Nouveau plat** : formulaire au-dessus de la liste
- Ajout de catégorie depuis l'en-tête

**3. Tables &amp; QR** (`/admin/tables`) — la page précédente, intégrée au layout admin.

### Imprimer les QR codes des tables

Connecte-toi en tant que **Yacouba Touré** (PIN 9999). Tu arrives sur `/admin/tables` :
- Une carte par table avec QR code SVG (généré côté client par la lib `qrcode`)
- Bouton **🖨 Imprimer** → ouvre la fenêtre d'impression du navigateur
- Le rendu est optimisé pour **A4 portrait, 6 placards par page** (page-break-inside évite de couper)
- Chaque carte montre : QR + "AK · CHEZ AÏSHA" + numéro de table + zone + capacité + instruction de scan
- Si un QR est compromis (photo, fuite), bouton **↻ Régénérer** → nouveau secret HMAC, ancien QR invalide immédiatement

L'URL encodée dans le QR utilise l'origin courant — donc en dev `http://localhost:5173/t/07?sig=...`, en prod `https://akresto.ci/t/07?sig=...` automatiquement.

## Inspecter la base

Adminer tourne sur http://localhost:8080
- Système : PostgreSQL
- Serveur : `postgres`
- Identifiant : `akresto`
- Mot de passe : `dev_changeme`
- Base : `akresto`

## Installer comme PWA

Build de prod avec service worker actif :
```bash
cd frontend
npm run build
npm run preview
```
Sur Chrome (desktop ou Android) : clique l'icône "Installer" dans la barre d'URL. Sur iOS Safari : Partager → Sur l'écran d'accueil.

## Ce qui reste à coder

Liste priorisée pour aller vers un MVP commercialisable :

- [x] ~~**Tableau de bord cuisine**~~ — fait ✓
- [x] ~~**Authentification staff**~~ — fait ✓
- [x] ~~**Tableau de bord caisse**~~ — fait ✓
- [x] ~~**Génération QR codes signés**~~ — fait ✓
- [x] ~~**Tableau de bord admin**~~ (stats + CRUD menu) — fait ✓
- [ ] **Intégration paiement réelle** (CinetPay en premier pour couvrir Wave/OM/MTN/cartes en une API ; flow webhook async)
- [ ] **Module fidélité** (compte client par téléphone, points, tiers)
- [ ] **Module avis** (rating + tags post-repas)
- [ ] **Synchronisation cloud** (sync queue + agent qui push toutes les 5 min)
- [ ] **Impression thermique ESC/POS** (tickets cuisine + reçus caisse)

Référence complète : voir le doc d'architecture livré séparément.

## Licence

Propriétaire — projet en cours de développement.
