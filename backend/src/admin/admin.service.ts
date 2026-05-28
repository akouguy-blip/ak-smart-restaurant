import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PG_POOL } from '../database.module';

const DEMO_RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

// Génère un UUID v4 côté Node (SQLite n'a pas gen_random_uuid())
function uuid(): string {
  return crypto.randomUUID();
}

@Injectable()
export class AdminService {
  constructor(@Inject(PG_POOL) private readonly pool: any) {}

  // ============ TABLES + QR ============

  async listTablesWithQR() {
    const res = await this.pool.query(
      `SELECT t.id, t.numero, t.capacite, t.statut, t.qr_secret,
              z.nom AS zone_nom, z.ordre AS zone_ordre
         FROM tables t
         LEFT JOIN zones z ON z.id = t.zone_id
        ORDER BY COALESCE(z.ordre, 99), t.numero`,
    );

    return res.rows.map((t: any) => ({
      id: t.id,
      numero: t.numero,
      capacite: t.capacite,
      zone: t.zone_nom,
      statut: t.statut,
      signed_path: this.signPath(t.id, t.numero, t.qr_secret),
    }));
  }

  async regenerateTableQR(id: string) {
    const newSecret = crypto.randomBytes(32).toString('hex');
    await this.pool.query(
      `UPDATE tables SET qr_secret = $1 WHERE id = $2`,
      [newSecret, id],
    );
    const res = await this.pool.query(
      `SELECT id, numero, qr_secret FROM tables WHERE id = $1`,
      [id],
    );
    if (res.rows.length === 0) throw new NotFoundException('Table introuvable');
    const t = res.rows[0];
    return {
      id: t.id,
      numero: t.numero,
      signed_path: this.signPath(t.id, t.numero, t.qr_secret),
    };
  }

  private signPath(tableId: string, numero: string, secret: string): string {
    const sig = crypto.createHmac('sha256', secret).update(tableId).digest('hex');
    return `/t/${numero}?sig=${sig}`;
  }

  // ============ STATS ============

  async getTodayStats() {
    // SQLite : pas d'AT TIME ZONE, on travaille en local time pour la démo
    // Pour la production multi-fuseau, on stockera tout en UTC et on convertira au moment du SELECT

    // KPIs aujourd'hui
    const todayRes = await this.pool.query(
      `SELECT
         COALESCE(SUM(o.total_fcfa), 0) AS ca,
         COUNT(o.id) AS trans,
         COALESCE((SELECT SUM(oi.quantite) FROM order_items oi
                    JOIN orders o2 ON o2.id = oi.order_id
                   WHERE o2.statut = 'payee'
                     AND date(o2.payee_le) = date('now', 'localtime')), 0) AS plats
       FROM orders o
       WHERE o.restaurant_id = $1
         AND o.statut = 'payee'
         AND date(o.payee_le) = date('now', 'localtime')`,
      [DEMO_RESTAURANT_ID],
    );

    // KPIs hier
    const yesterdayRes = await this.pool.query(
      `SELECT
         COALESCE(SUM(o.total_fcfa), 0) AS ca,
         COUNT(o.id) AS trans,
         COALESCE((SELECT SUM(oi.quantite) FROM order_items oi
                    JOIN orders o2 ON o2.id = oi.order_id
                   WHERE o2.statut = 'payee'
                     AND date(o2.payee_le) = date('now', '-1 day', 'localtime')), 0) AS plats
       FROM orders o
       WHERE o.restaurant_id = $1
         AND o.statut = 'payee'
         AND date(o.payee_le) = date('now', '-1 day', 'localtime')`,
      [DEMO_RESTAURANT_ID],
    );

    const today = todayRes.rows[0];
    const yesterday = yesterdayRes.rows[0];
    const ca = Number(today.ca);
    const trans = Number(today.trans);
    const ticketMoyen = trans > 0 ? Math.round(ca / trans) : 0;

    // CA par heure aujourd'hui (SQLite : strftime au lieu d'EXTRACT)
    const hourlyRes = await this.pool.query(
      `SELECT
         CAST(strftime('%H', payee_le, 'localtime') AS INTEGER) AS heure,
         SUM(total_fcfa) AS ca,
         COUNT(*) AS nb
       FROM orders
       WHERE restaurant_id = $1
         AND statut = 'payee'
         AND date(payee_le) = date('now', 'localtime')
       GROUP BY heure
       ORDER BY heure`,
      [DEMO_RESTAURANT_ID],
    );

    // Top 5 plats par revenu aujourd'hui
    const topRes = await this.pool.query(
      `SELECT i.id, i.nom,
              SUM(oi.quantite) AS ventes,
              SUM(oi.prix_unitaire_fcfa * oi.quantite) AS ca
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN items i ON i.id = oi.item_id
       WHERE o.restaurant_id = $1
         AND o.statut = 'payee'
         AND date(o.payee_le) = date('now', 'localtime')
       GROUP BY i.id, i.nom
       ORDER BY ca DESC
       LIMIT 5`,
      [DEMO_RESTAURANT_ID],
    );

    // Répartition par méthode de paiement
    const paymentsRes = await this.pool.query(
      `SELECT methode, COUNT(*) AS nb, SUM(montant_fcfa) AS total
       FROM payments
       WHERE statut = 'reussi'
         AND date(confirme_le) = date('now', 'localtime')
       GROUP BY methode
       ORDER BY total DESC`,
    );

    const deltaPct = (now: number, then: number): number | null => {
      if (!then || then === 0) return null;
      return Math.round(((now - then) / then) * 100);
    };

    return {
      kpis: {
        ca_fcfa: ca,
        transactions: trans,
        ticket_moyen_fcfa: ticketMoyen,
        plats_vendus: Number(today.plats),
        delta_ca_pct: deltaPct(ca, Number(yesterday.ca)),
        delta_transactions: trans - Number(yesterday.trans),
        delta_plats: Number(today.plats) - Number(yesterday.plats),
      },
      hourly: hourlyRes.rows.map((r: any) => ({
        heure: Number(r.heure),
        ca: Number(r.ca),
        nb: Number(r.nb),
      })),
      top_items: topRes.rows.map((r: any) => ({
        id: r.id,
        nom: r.nom,
        ventes: Number(r.ventes),
        ca: Number(r.ca),
      })),
      payments_by_method: paymentsRes.rows.map((r: any) => ({
        methode: r.methode,
        nb: Number(r.nb),
        total: Number(r.total),
      })),
    };
  }

  // ============ MENU CRUD ============

  async listMenuAdmin() {
    const cats = await this.pool.query(
      `SELECT id, nom, icone, ordre, active
         FROM categories WHERE restaurant_id = $1 ORDER BY ordre, nom`,
      [DEMO_RESTAURANT_ID],
    );
    const items = await this.pool.query(
      `SELECT id, category_id, nom, description, prix_fcfa, disponible,
              temps_prep_minutes, est_vedette, tags, ordre, image_url
         FROM items WHERE restaurant_id = $1 ORDER BY ordre, nom`,
      [DEMO_RESTAURANT_ID],
    );
    // SQLite renvoie 0/1 pour les BOOLEAN — convertir en true/false côté API
    return {
      categories: cats.rows.map((c: any) => ({ ...c, active: !!c.active })),
      items: items.rows.map((i: any) => ({
        ...i,
        disponible: !!i.disponible,
        est_vedette: !!i.est_vedette,
        tags: this.parseJson(i.tags, []),
      })),
    };
  }

  async createItem(dto: {
    category_id: string; nom: string; description?: string; prix_fcfa: number;
    temps_prep_minutes?: number; est_vedette?: boolean; tags?: string[];
  }) {
    if (!dto.nom?.trim()) throw new BadRequestException('Le nom est requis');
    if (!dto.prix_fcfa || dto.prix_fcfa <= 0) throw new BadRequestException('Le prix doit être positif');

    const id = uuid();
    await this.pool.query(
      `INSERT INTO items (id, restaurant_id, category_id, nom, description, prix_fcfa,
                          temps_prep_minutes, est_vedette, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id, DEMO_RESTAURANT_ID, dto.category_id, dto.nom.trim(),
        dto.description || null, dto.prix_fcfa,
        dto.temps_prep_minutes || 15, dto.est_vedette ? 1 : 0,
        JSON.stringify(dto.tags || []),
      ],
    );
    const res = await this.pool.query(`SELECT * FROM items WHERE id = $1`, [id]);
    return this.normalizeItem(res.rows[0]);
  }

  async updateItem(id: string, dto: any) {
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;
    const allowed = ['category_id', 'nom', 'description', 'prix_fcfa', 'disponible',
                     'temps_prep_minutes', 'est_vedette', 'tags'];
    for (const key of allowed) {
      if (dto[key] !== undefined) {
        let v = dto[key];
        if (key === 'tags' && Array.isArray(v)) v = JSON.stringify(v);
        if (typeof v === 'boolean') v = v ? 1 : 0;
        sets.push(`${key} = $${i++}`);
        values.push(v);
      }
    }
    if (sets.length === 0) throw new BadRequestException('Aucun champ à mettre à jour');
    sets.push(`modifie_le = datetime('now')`);
    values.push(id);

    await this.pool.query(
      `UPDATE items SET ${sets.join(', ')} WHERE id = $${i}`,
      values,
    );
    const res = await this.pool.query(`SELECT * FROM items WHERE id = $1`, [id]);
    if (res.rows.length === 0) throw new NotFoundException('Plat introuvable');
    return this.normalizeItem(res.rows[0]);
  }

  async deleteItem(id: string) {
    try {
      const res = await this.pool.query(`DELETE FROM items WHERE id = $1`, [id]);
      if (res.rowCount === 0) throw new NotFoundException('Plat introuvable');
      return { deleted: true };
    } catch (err: any) {
      if (err.code === '23503') {
        throw new ConflictException(
          "Ce plat a déjà été commandé — désactivez-le plutôt que de le supprimer.",
        );
      }
      throw err;
    }
  }

  async createCategory(dto: { nom: string; icone?: string; ordre?: number }) {
    if (!dto.nom?.trim()) throw new BadRequestException('Le nom est requis');
    const id = uuid();
    await this.pool.query(
      `INSERT INTO categories (id, restaurant_id, nom, icone, ordre)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, DEMO_RESTAURANT_ID, dto.nom.trim(), dto.icone || null, dto.ordre || 0],
    );
    const res = await this.pool.query(`SELECT * FROM categories WHERE id = $1`, [id]);
    const row = res.rows[0];
    return { ...row, active: !!row.active };
  }

  async updateCategory(id: string, dto: any) {
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const key of ['nom', 'icone', 'ordre', 'active']) {
      if (dto[key] !== undefined) {
        let v = dto[key];
        if (typeof v === 'boolean') v = v ? 1 : 0;
        sets.push(`${key} = $${i++}`);
        values.push(v);
      }
    }
    if (sets.length === 0) throw new BadRequestException('Aucun champ à mettre à jour');
    values.push(id);
    await this.pool.query(`UPDATE categories SET ${sets.join(', ')} WHERE id = $${i}`, values);
    const res = await this.pool.query(`SELECT * FROM categories WHERE id = $1`, [id]);
    if (res.rows.length === 0) throw new NotFoundException('Catégorie introuvable');
    const row = res.rows[0];
    return { ...row, active: !!row.active };
  }

  async deleteCategory(id: string) {
    try {
      const res = await this.pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
      if (res.rowCount === 0) throw new NotFoundException('Catégorie introuvable');
      return { deleted: true };
    } catch (err: any) {
      if (err.code === '23503') {
        throw new ConflictException(
          "Cette catégorie contient des plats — supprimez ou déplacez-les d'abord.",
        );
      }
      throw err;
    }
  }

  // ---- helpers ----

  private normalizeItem(row: any) {
    if (!row) return row;
    return {
      ...row,
      disponible: !!row.disponible,
      est_vedette: !!row.est_vedette,
      tags: this.parseJson(row.tags, []),
    };
  }

  private parseJson(value: any, fallback: any) {
    if (!value) return fallback;
    if (Array.isArray(value) || typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
  }
}
