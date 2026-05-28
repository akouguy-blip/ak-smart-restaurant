import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PG_POOL } from '../database.module';

@Injectable()
export class MenuService {
  constructor(@Inject(PG_POOL) private readonly pool: any) {}

  async getPublicMenuForTable(numero: string, signature?: string) {
    // 1. Trouver la table et son restaurant
    const tableRes = await this.pool.query(
      `SELECT t.id, t.numero, t.capacite, t.qr_secret, t.statut,
              r.id AS restaurant_id, r.nom AS restaurant_nom, r.devise, r.tva_taux,
              z.nom AS zone_nom
         FROM tables t
         JOIN restaurants r ON r.id = t.restaurant_id
         LEFT JOIN zones z ON z.id = t.zone_id
        WHERE t.numero = $1
        LIMIT 1`,
      [numero],
    );

    if (tableRes.rowCount === 0) return null;
    const table = tableRes.rows[0];

    // 2. Vérifier la signature HMAC si fournie
    if (signature) {
      const expected = crypto
        .createHmac('sha256', table.qr_secret)
        .update(table.id)
        .digest('hex');
      if (signature !== expected) return null;
    }

    // 3. Charger catégories et items
    // (SQLite : boolean = 1/0, on filtre sur = 1)
    const catRes = await this.pool.query(
      `SELECT id, nom, icone, ordre
         FROM categories
        WHERE restaurant_id = $1 AND active = 1
        ORDER BY ordre, nom`,
      [table.restaurant_id],
    );
    const itemsRes = await this.pool.query(
      `SELECT id, category_id, nom, description, prix_fcfa, image_url,
              temps_prep_minutes, est_vedette, tags
         FROM items
        WHERE restaurant_id = $1 AND disponible = 1
        ORDER BY ordre, nom`,
      [table.restaurant_id],
    );

    return {
      restaurant: {
        id: table.restaurant_id,
        nom: table.restaurant_nom,
        devise: table.devise,
        tva_taux: parseFloat(table.tva_taux),
      },
      table: {
        id: table.id,
        numero: table.numero,
        zone: table.zone_nom,
        capacite: table.capacite,
        statut: table.statut,
      },
      categories: catRes.rows,
      items: itemsRes.rows.map((i: any) => ({
        ...i,
        est_vedette: !!i.est_vedette,
        tags: typeof i.tags === 'string' ? (() => { try { return JSON.parse(i.tags); } catch { return []; } })() : (i.tags || []),
      })),
    };
  }
}
