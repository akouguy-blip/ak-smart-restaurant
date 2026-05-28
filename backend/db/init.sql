-- AK Smart Restaurant — schéma initial + données seed
-- À exécuter avec : psql $DATABASE_URL -f ./db/init.sql

-- ============================================================
-- NETTOYAGE (utile en dev pour re-seeder)
-- ============================================================
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SCHÉMA
-- ============================================================

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(120) NOT NULL,
  zone VARCHAR(60),
  ville VARCHAR(60) DEFAULT 'Abidjan',
  pays VARCHAR(2) DEFAULT 'CI',
  telephone VARCHAR(20),
  email VARCHAR(120),
  logo_url TEXT,
  devise VARCHAR(3) DEFAULT 'XOF',
  tva_taux DECIMAL(5,2) DEFAULT 18.00,
  fuseau_horaire VARCHAR(60) DEFAULT 'Africa/Abidjan',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nom VARCHAR(80) NOT NULL,
  prenom VARCHAR(80),
  email VARCHAR(120) UNIQUE,
  telephone VARCHAR(20),
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','gerant','cuisine','caisse','serveur')),
  pin_hash VARCHAR(255),
  password_hash VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nom VARCHAR(60) NOT NULL,
  ordre INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id),
  numero VARCHAR(10) NOT NULL,
  capacite INTEGER DEFAULT 4,
  qr_secret VARCHAR(64) NOT NULL,
  statut VARCHAR(20) DEFAULT 'libre' CHECK (statut IN ('libre','occupee','reservee','hors_service')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, numero)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  nom VARCHAR(60) NOT NULL,
  icone VARCHAR(60),
  ordre INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  nom VARCHAR(120) NOT NULL,
  description TEXT,
  prix_fcfa INTEGER NOT NULL,
  image_url TEXT,
  disponible BOOLEAN DEFAULT TRUE,
  temps_prep_minutes INTEGER DEFAULT 15,
  est_vedette BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  numero_court VARCHAR(10) NOT NULL,
  table_id UUID REFERENCES tables(id),
  serveur_id UUID REFERENCES users(id),
  statut VARCHAR(20) NOT NULL DEFAULT 'nouvelle'
    CHECK (statut IN ('nouvelle','en_cuisine','presque_prete','prete','servie','payee','annulee')),
  type VARCHAR(20) DEFAULT 'sur_place',
  sous_total_fcfa INTEGER NOT NULL DEFAULT 0,
  remise_fcfa INTEGER DEFAULT 0,
  tva_fcfa INTEGER DEFAULT 0,
  total_fcfa INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  cree_at TIMESTAMPTZ DEFAULT NOW(),
  en_cuisine_at TIMESTAMPTZ,
  prete_at TIMESTAMPTZ,
  servie_at TIMESTAMPTZ,
  payee_at TIMESTAMPTZ
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  nom_snapshot VARCHAR(120) NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire_fcfa INTEGER NOT NULL,
  options JSONB DEFAULT '{}',
  notes TEXT,
  statut VARCHAR(20) DEFAULT 'a_preparer'
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  caissier_id UUID REFERENCES users(id),
  montant_fcfa INTEGER NOT NULL,
  methode VARCHAR(20) NOT NULL
    CHECK (methode IN ('wave','orange_money','mtn_momo','moov_money','carte','especes')),
  reference_externe VARCHAR(120),
  client_telephone VARCHAR(20),
  statut VARCHAR(20) NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','reussi','echec','rembourse','expire')),
  payload_provider JSONB,
  erreur_message TEXT,
  cree_at TIMESTAMPTZ DEFAULT NOW(),
  confirme_at TIMESTAMPTZ,
  expire_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_cuisine ON orders(restaurant_id, statut);
CREATE INDEX idx_orders_table ON orders(table_id) WHERE statut NOT IN ('payee','annulee');
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_items_menu ON items(restaurant_id, category_id, disponible) WHERE disponible = TRUE;
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_methode ON payments(methode, statut, cree_at);

-- ============================================================
-- SEED — Restaurant fictif "Chez Aïsha" à Cocody Riviera
-- ============================================================

INSERT INTO restaurants (id, nom, zone, ville, telephone, email, tva_taux)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Chez Aïsha',
  'Cocody Riviera',
  'Abidjan',
  '+225 27 22 44 56 78',
  'contact@chezaisha.ci',
  18.00
);

-- Gérant
INSERT INTO users (restaurant_id, nom, prenom, email, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Touré', 'Yacouba', 'gerant@chezaisha.ci', 'gerant'
);

-- Zones de la salle
INSERT INTO zones (id, restaurant_id, nom, ordre) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Terrasse', 1),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Salle climatisée', 2),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Salon VIP', 3);

-- 9 tables avec QR secrets aléatoires
INSERT INTO tables (restaurant_id, zone_id, numero, capacite, qr_secret) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '05', 2, encode(gen_random_bytes(32), 'hex')),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '06', 2, encode(gen_random_bytes(32), 'hex')),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '07', 4, encode(gen_random_bytes(32), 'hex')),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '08', 4, encode(gen_random_bytes(32), 'hex')),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '09', 4, encode(gen_random_bytes(32), 'hex')),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '10', 4, encode(gen_random_bytes(32), 'hex')),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '11', 6, encode(gen_random_bytes(32), 'hex')),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '12', 4, encode(gen_random_bytes(32), 'hex')),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', 'VIP1', 6, encode(gen_random_bytes(32), 'hex'));

-- Catégories de menu
INSERT INTO categories (id, restaurant_id, nom, icone, ordre) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Plats principaux', 'utensils', 1),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Grillades', 'flame', 2),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Entrées', 'salad', 3),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'Boissons', 'glass-water', 4),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'Desserts', 'cake', 5);

-- Plats ivoiriens authentiques
INSERT INTO items (restaurant_id, category_id, nom, description, prix_fcfa, est_vedette, temps_prep_minutes, tags, ordre) VALUES
  -- Plats principaux
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
   'Poulet Kedjenou',
   'Poulet mijoté à l''étouffée avec gingembre, tomates, oignons et piment. Servi avec attiéké.',
   5500, TRUE, 25, ARRAY['traditionnel','volaille'], 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
   'Sauce graine au poisson fumé',
   'Sauce épicée à base de noix de palme, poisson fumé. Accompagnée de riz blanc.',
   4500, FALSE, 20, ARRAY['traditionnel','poisson','piquant'], 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
   'Foutou banane sauce arachide',
   'Foutou banane plantain, sauce arachide pimentée et morceaux de bœuf.',
   4000, FALSE, 30, ARRAY['traditionnel','viande'], 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
   'Tieb au poisson',
   'Riz au poisson à la sénégalaise, légumes mijotés, sauce tomate.',
   4500, FALSE, 35, ARRAY['poisson','riz'], 4),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
   'Attiéké poisson braisé',
   'Attiéké, poisson braisé entier, alloco, sauce piment maison.',
   4500, TRUE, 20, ARRAY['poisson','traditionnel'], 5),

  -- Grillades
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
   'Capitaine grillé',
   'Filet de capitaine grillé au feu de bois, attiéké, alloco, salade verte.',
   7000, TRUE, 25, ARRAY['poisson','grillade'], 6),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
   'Brochettes de bœuf',
   'Trois brochettes de bœuf marinées, frites maison, salade.',
   6500, FALSE, 20, ARRAY['viande','grillade'], 7),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021',
   'Filet de bœuf à la braise',
   'Filet de bœuf grillé, sauce piquante, accompagnement au choix.',
   9500, FALSE, 25, ARRAY['viande','premium'], 8),

  -- Entrées
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
   'Salade Mesclun',
   'Jeunes pousses, tomates cerises, vinaigrette balsamique.',
   2500, FALSE, 10, ARRAY['vegetarien','salade'], 9),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
   'Avocat crevettes',
   'Avocat frais, crevettes roses, sauce cocktail.',
   4500, FALSE, 10, ARRAY['fruits-de-mer'], 10),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000022',
   'Aloko',
   'Bananes plantain frites, sauce piment maison.',
   1500, FALSE, 8, ARRAY['vegetarien','traditionnel'], 11),

  -- Boissons
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
   'Bissap',
   'Boisson glacée à l''hibiscus, gingembre, menthe fraîche.',
   1000, TRUE, 2, ARRAY['rafraichissant','traditionnel'], 12),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
   'Gnamakoudji',
   'Jus de gingembre frais sucré, citron vert.',
   1000, FALSE, 2, ARRAY['rafraichissant','traditionnel'], 13),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
   'Eau minérale 50cl',
   NULL, 500, FALSE, 1, ARRAY['eau'], 14),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
   'Coca-Cola 33cl',
   NULL, 1000, FALSE, 1, ARRAY['soda'], 15),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000023',
   'Jus d''ananas frais',
   'Pressé minute.', 1500, FALSE, 3, ARRAY['rafraichissant'], 16),

  -- Desserts
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000024',
   'Dégué',
   'Couscous de mil sucré au yaourt et muscade.',
   1500, FALSE, 5, ARRAY['traditionnel'], 17),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000024',
   'Salade de fruits frais',
   'Ananas, mangue, papaye, citron vert.',
   2000, FALSE, 5, ARRAY['frais'], 18),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000024',
   'Crème caramel maison',
   NULL, 2000, FALSE, 5, ARRAY['classique'], 19);

-- ============================================================
-- VÉRIFICATION
-- ============================================================
DO $$
DECLARE
  nb_resto INT;
  nb_zones INT;
  nb_tables INT;
  nb_cats INT;
  nb_items INT;
BEGIN
  SELECT COUNT(*) INTO nb_resto FROM restaurants;
  SELECT COUNT(*) INTO nb_zones FROM zones;
  SELECT COUNT(*) INTO nb_tables FROM tables;
  SELECT COUNT(*) INTO nb_cats FROM categories;
  SELECT COUNT(*) INTO nb_items FROM items;
  RAISE NOTICE '=== Seed AK Resto terminé ===';
  RAISE NOTICE '  % restaurant(s)', nb_resto;
  RAISE NOTICE '  % zones', nb_zones;
  RAISE NOTICE '  % tables', nb_tables;
  RAISE NOTICE '  % catégories', nb_cats;
  RAISE NOTICE '  % plats', nb_items;
END $$;
