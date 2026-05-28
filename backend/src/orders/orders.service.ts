import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PG_POOL } from '../database.module';
import { CreateOrderDto } from './orders.dto';

const STATUS_TS_COLUMN: Record<string, string | null> = {
  en_cuisine: 'en_cuisine_le',
  prete: 'prete_le',
  servie: 'servie_le',
  payee: 'payee_le',
};

@Injectable()
export class OrdersService {
  constructor(@Inject(PG_POOL) private readonly pool: any) {}

  async create(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La commande doit contenir au moins un plat');
    }

    // 1. Trouver le restaurant via la table
    const tableRes = await this.pool.query(
      `SELECT restaurant_id FROM tables WHERE id = $1`,
      [dto.table_id],
    );
    if (tableRes.rowCount === 0) throw new NotFoundException('Table inconnue');
    const restaurant_id = tableRes.rows[0].restaurant_id;

    // 2. Charger les items et leurs prix RÉELS (jamais ce que dit le client)
    // SQLite n'a pas ANY($1::uuid[]) → on génère un IN (?, ?, ?) dynamiquement
    const itemIds = dto.items.map((i) => i.item_id);
    const placeholders = itemIds.map((_, i) => `$${i + 2}`).join(', ');
    const itemsRes = await this.pool.query(
      `SELECT id, nom, prix_fcfa FROM items
        WHERE restaurant_id = $1
          AND disponible = 1
          AND id IN (${placeholders})`,
      [restaurant_id, ...itemIds],
    );
    const itemMap = new Map<string, { id: string; nom: string; prix_fcfa: number }>(
      itemsRes.rows.map((i: any) => [i.id, i]),
    );

    let sous_total = 0;
    const lignes = dto.items.map((item) => {
      const dbItem = itemMap.get(item.item_id);
      if (!dbItem) throw new NotFoundException(`Plat indisponible : ${item.item_id}`);
      const ligne_total = dbItem.prix_fcfa * item.quantite;
      sous_total += ligne_total;
      return { ...item, dbItem, ligne_total };
    });

    // 3. TVA incluse dans le prix (calcul de la part TVA)
    const tva = Math.round((sous_total * 18) / 118);
    const total = sous_total;

    // 4. Numéro court incrémental par jour (SQLite : date('now') au lieu de CURRENT_DATE)
    const numeroRes = await this.pool.query(
      `SELECT COALESCE(MAX(CAST(numero AS INTEGER)), 1240) + 1 AS next
         FROM orders
        WHERE restaurant_id = $1
          AND date(cree_le) = date('now', 'localtime')`,
      [restaurant_id],
    );
    const numero = String(numeroRes.rows[0].next);

    // 5. Création de l'order (transaction implicite SQLite via WAL)
    const orderId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO orders
         (id, restaurant_id, numero, table_id, statut,
          sous_total_fcfa, tva_fcfa, total_fcfa, remarque_client)
       VALUES ($1, $2, $3, $4, 'nouvelle', $5, $6, $7, $8)`,
      [orderId, restaurant_id, numero, dto.table_id, sous_total, tva, total, dto.notes || null],
    );

    // 6. Items de la commande
    for (const ligne of lignes) {
      await this.pool.query(
        `INSERT INTO order_items
           (id, order_id, item_id, nom_snapshot, quantite, prix_unitaire_fcfa, remarque)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          orderId,
          ligne.item_id,
          ligne.dbItem.nom,
          ligne.quantite,
          ligne.dbItem.prix_fcfa,
          ligne.notes || null,
        ],
      );
    }

    // 7. Marquer la table comme occupée
    await this.pool.query(
      `UPDATE tables SET statut = 'occupee' WHERE id = $1`,
      [dto.table_id],
    );

    return this.findOne(orderId);
  }

  async findOne(id: string) {
    const orderRes = await this.pool.query(
      `SELECT o.*, t.numero AS table_numero
         FROM orders o
         LEFT JOIN tables t ON t.id = o.table_id
        WHERE o.id = $1`,
      [id],
    );
    if (orderRes.rowCount === 0) throw new NotFoundException('Commande introuvable');

    const itemsRes = await this.pool.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`,
      [id],
    );

    return { ...orderRes.rows[0], items: itemsRes.rows };
  }

  async findActive() {
    const res = await this.pool.query(
      `SELECT o.*, t.numero AS table_numero
         FROM orders o
         LEFT JOIN tables t ON t.id = o.table_id
        WHERE o.statut IN ('nouvelle', 'en_cuisine', 'prete')
        ORDER BY o.cree_le ASC`,
    );
    const orders = res.rows;
    if (orders.length === 0) return [];

    const orderIds = orders.map((o: any) => o.id);
    const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(', ');
    const itemsRes = await this.pool.query(
      `SELECT * FROM order_items
        WHERE order_id IN (${placeholders}) ORDER BY id`,
      orderIds,
    );
    const itemsByOrder = new Map<string, any[]>();
    for (const item of itemsRes.rows) {
      const list = itemsByOrder.get(item.order_id) || [];
      list.push(item);
      itemsByOrder.set(item.order_id, list);
    }
    return orders.map((o: any) => ({ ...o, items: itemsByOrder.get(o.id) || [] }));
  }

  async updateStatus(id: string, statut: string) {
    const allowed = ['nouvelle', 'en_cuisine', 'prete', 'servie', 'payee', 'annulee'];
    if (!allowed.includes(statut)) {
      throw new BadRequestException(`Statut invalide : ${statut}`);
    }

    const setTs = STATUS_TS_COLUMN[statut];
    const updateSql = setTs
      ? `UPDATE orders SET statut = $1, ${setTs} = datetime('now') WHERE id = $2`
      : `UPDATE orders SET statut = $1 WHERE id = $2`;

    const res = await this.pool.query(updateSql, [statut, id]);
    if (res.rowCount === 0) throw new NotFoundException('Commande introuvable');

    return this.findOne(id);
  }
}
