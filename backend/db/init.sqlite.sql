-- ============================================================
-- AK Smart Restaurant — Schéma SQLite
-- 
-- Différences vs PostgreSQL :
--   - UUID stocké en TEXT (généré côté Node.js)
--   - BOOLEAN stocké en INTEGER (0/1)
--   - JSONB → TEXT contenant du JSON sérialisé
--   - TIMESTAMPTZ → TEXT en ISO 8601 (UTC)
--   - Pas de DO $$ ... $$, on utilise INSERT OR IGNORE
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;     -- meilleure concurrence lecture/écriture
PRAGMA synchronous = NORMAL;   -- bon compromis perf/sécurité

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  zone TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  tva_taux REAL DEFAULT 18.0,
  devise TEXT DEFAULT 'FCFA',
  fuseau TEXT DEFAULT 'Africa/Abidjan',
  cree_le TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  ordre INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  zone_id TEXT REFERENCES zones(id),
  numero TEXT NOT NULL,
  capacite INTEGER DEFAULT 4,
  statut TEXT DEFAULT 'libre',  -- libre, occupee, reservee
  qr_secret TEXT NOT NULL,
  cree_le TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  icone TEXT,
  ordre INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  nom TEXT NOT NULL,
  description TEXT,
  prix_fcfa INTEGER NOT NULL,
  image_url TEXT,
  disponible INTEGER DEFAULT 1,
  temps_prep_minutes INTEGER DEFAULT 15,
  est_vedette INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',       -- JSON array stocké en TEXT
  ordre INTEGER DEFAULT 0,
  cree_le TEXT DEFAULT (datetime('now')),
  modifie_le TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_disponible ON items(disponible);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  role TEXT NOT NULL,           -- cuisine, caisse, gerant, admin
  pin_hash TEXT NOT NULL,
  actif INTEGER DEFAULT 1,
  cree_le TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_restaurant_role ON users(restaurant_id, role);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  table_id TEXT NOT NULL REFERENCES tables(id),
  statut TEXT NOT NULL DEFAULT 'nouvelle',  -- nouvelle, en_cuisine, prete, servie, payee, annulee
  sous_total_fcfa INTEGER NOT NULL DEFAULT 0,
  tva_fcfa INTEGER NOT NULL DEFAULT 0,
  total_fcfa INTEGER NOT NULL DEFAULT 0,
  remarque_client TEXT,
  cree_le TEXT DEFAULT (datetime('now')),
  en_cuisine_le TEXT,
  prete_le TEXT,
  servie_le TEXT,
  payee_le TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_statut ON orders(restaurant_id, statut);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_payee_le ON orders(payee_le);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id),
  nom_snapshot TEXT NOT NULL,
  prix_unitaire_fcfa INTEGER NOT NULL,
  quantite INTEGER NOT NULL CHECK(quantite > 0),
  remarque TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  methode TEXT NOT NULL,  -- wave, orange_money, mtn_momo, moov_money, carte, especes
  montant_fcfa INTEGER NOT NULL,
  statut TEXT DEFAULT 'reussi',  -- reussi, en_attente, echec
  reference_externe TEXT,
  cree_le TEXT DEFAULT (datetime('now')),
  confirme_le TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_confirme_le ON payments(confirme_le);

-- ============================================================
-- Seed : Chez Aïsha (jeu de données démo)
-- INSERT OR IGNORE → idempotent, peut être relancé sans erreur
-- ============================================================

INSERT OR IGNORE INTO restaurants (id, nom, zone, ville, telephone, email, tva_taux)
VALUES ('00000000-0000-0000-0000-000000000001', 'Chez Aïsha', 'Cocody Riviera', 'Abidjan', '+225 27 22 44 55 66', 'contact@chezaisha.ci', 18.0);

-- Zones
INSERT OR IGNORE INTO zones (id, restaurant_id, nom, ordre) VALUES
  ('zone-001', '00000000-0000-0000-0000-000000000001', 'Terrasse', 1),
  ('zone-002', '00000000-0000-0000-0000-000000000001', 'Salle climatisée', 2),
  ('zone-003', '00000000-0000-0000-0000-000000000001', 'Salon VIP', 3);

-- Tables (qr_secret généré au build, on le met en hex aléatoire fixe pour le seed)
INSERT OR IGNORE INTO tables (id, restaurant_id, zone_id, numero, capacite, qr_secret) VALUES
  ('table-05', '00000000-0000-0000-0000-000000000001', 'zone-001', '05', 2, 'd9c8b5a1e3f4d2c6b9a8e7f5c4d3b2a1'),
  ('table-06', '00000000-0000-0000-0000-000000000001', 'zone-001', '06', 2, 'e8b7a4c2d3f1e5d4c3b9a8f7e6d5c4b3'),
  ('table-07', '00000000-0000-0000-0000-000000000001', 'zone-001', '07', 4, 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'),
  ('table-08', '00000000-0000-0000-0000-000000000001', 'zone-001', '08', 4, 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7'),
  ('table-09', '00000000-0000-0000-0000-000000000001', 'zone-002', '09', 4, 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8'),
  ('table-10', '00000000-0000-0000-0000-000000000001', 'zone-002', '10', 4, 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9'),
  ('table-11', '00000000-0000-0000-0000-000000000001', 'zone-002', '11', 6, 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0'),
  ('table-12', '00000000-0000-0000-0000-000000000001', 'zone-002', '12', 4, 'f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1'),
  ('table-vip1', '00000000-0000-0000-0000-000000000001', 'zone-003', 'VIP1', 6, 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2');

-- Catégories
INSERT OR IGNORE INTO categories (id, restaurant_id, nom, icone, ordre) VALUES
  ('cat-001', '00000000-0000-0000-0000-000000000001', 'Plats principaux', '🍲', 1),
  ('cat-002', '00000000-0000-0000-0000-000000000001', 'Grillades', '🔥', 2),
  ('cat-003', '00000000-0000-0000-0000-000000000001', 'Entrées', '🥗', 3),
  ('cat-004', '00000000-0000-0000-0000-000000000001', 'Boissons', '🥤', 4),
  ('cat-005', '00000000-0000-0000-0000-000000000001', 'Desserts', '🍰', 5);

-- Items : 19 plats ivoiriens
INSERT OR IGNORE INTO items (id, restaurant_id, category_id, nom, description, prix_fcfa, temps_prep_minutes, est_vedette, ordre) VALUES
  -- Plats principaux
  ('item-001', '00000000-0000-0000-0000-000000000001', 'cat-001', 'Poulet Kedjenou', 'Poulet mijoté à l''étouffée avec gingembre, tomates, oignons et piment. Servi avec attiéké.', 5500, 25, 1, 1),
  ('item-002', '00000000-0000-0000-0000-000000000001', 'cat-001', 'Sauce graine au poisson fumé', 'Sauce épicée à base de noix de palme, poisson fumé. Servi avec riz.', 4500, 20, 0, 2),
  ('item-003', '00000000-0000-0000-0000-000000000001', 'cat-001', 'Foutou banane sauce arachide', 'Foutou banane plantain, sauce arachide pimentée et morceaux de bœuf.', 4000, 30, 0, 3),
  ('item-004', '00000000-0000-0000-0000-000000000001', 'cat-001', 'Tieb au poisson', 'Riz au poisson à la sénégalaise, légumes mijotés, sauce tomate.', 4500, 35, 0, 4),
  ('item-005', '00000000-0000-0000-0000-000000000001', 'cat-001', 'Attiéké poisson braisé', 'Attiéké, poisson braisé entier, alloco, sauce piment maison.', 4500, 20, 1, 5),
  -- Grillades
  ('item-006', '00000000-0000-0000-0000-000000000001', 'cat-002', 'Capitaine grillé', 'Filet de capitaine grillé au feu de bois, attiéké, alloco, salade.', 7000, 25, 1, 1),
  ('item-007', '00000000-0000-0000-0000-000000000001', 'cat-002', 'Brochettes de bœuf', 'Trois brochettes marinées, frites maison, salade.', 6500, 20, 0, 2),
  ('item-008', '00000000-0000-0000-0000-000000000001', 'cat-002', 'Filet de bœuf à la braise', 'Filet de bœuf grillé, sauce piquante, accompagnement au choix.', 9500, 25, 0, 3),
  -- Entrées
  ('item-009', '00000000-0000-0000-0000-000000000001', 'cat-003', 'Salade Mesclun', 'Jeunes pousses, tomates cerises, vinaigrette balsamique.', 2500, 10, 0, 1),
  ('item-010', '00000000-0000-0000-0000-000000000001', 'cat-003', 'Avocat crevettes', 'Avocat frais, crevettes roses, sauce cocktail.', 4500, 10, 0, 2),
  ('item-011', '00000000-0000-0000-0000-000000000001', 'cat-003', 'Aloko', 'Bananes plantain frites, sauce piment maison.', 1500, 8, 0, 3),
  -- Boissons
  ('item-012', '00000000-0000-0000-0000-000000000001', 'cat-004', 'Bissap', 'Boisson glacée à l''hibiscus, gingembre, menthe fraîche.', 1000, 2, 1, 1),
  ('item-013', '00000000-0000-0000-0000-000000000001', 'cat-004', 'Gnamakoudji', 'Jus de gingembre frais sucré, citron vert.', 1000, 2, 0, 2),
  ('item-014', '00000000-0000-0000-0000-000000000001', 'cat-004', 'Eau minérale 50cl', NULL, 500, 1, 0, 3),
  ('item-015', '00000000-0000-0000-0000-000000000001', 'cat-004', 'Coca-Cola 33cl', NULL, 1000, 1, 0, 4),
  ('item-016', '00000000-0000-0000-0000-000000000001', 'cat-004', 'Jus d''ananas frais', 'Pressé minute.', 1500, 3, 0, 5),
  -- Desserts
  ('item-017', '00000000-0000-0000-0000-000000000001', 'cat-005', 'Dégué', 'Couscous de mil sucré au yaourt et muscade.', 1500, 5, 0, 1),
  ('item-018', '00000000-0000-0000-0000-000000000001', 'cat-005', 'Salade de fruits frais', 'Ananas, mangue, papaye, citron vert.', 2000, 5, 0, 2),
  ('item-019', '00000000-0000-0000-0000-000000000001', 'cat-005', 'Crème caramel maison', NULL, 2000, 5, 0, 3);
