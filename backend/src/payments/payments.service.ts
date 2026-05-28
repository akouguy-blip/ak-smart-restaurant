import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PG_POOL } from '../database.module';
import { OrdersService } from '../orders/orders.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { RecordPaymentDto } from './payments.dto';
import { AuthUser } from '../auth/decorators';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: any,
    private readonly orders: OrdersService,
    private readonly gateway: OrdersGateway,
  ) {}

  async record(dto: RecordPaymentDto, user: AuthUser) {
    // SQLite avec WAL = sérialisation des writes, pas besoin de FOR UPDATE
    const orderRes = await this.pool.query(
      `SELECT id, total_fcfa, statut, table_id, restaurant_id FROM orders WHERE id = $1`,
      [dto.order_id],
    );
    if (orderRes.rowCount === 0) throw new NotFoundException('Commande introuvable');
    const order = orderRes.rows[0];

    if (order.statut === 'payee') {
      throw new BadRequestException('Commande déjà payée');
    }
    if (order.statut === 'annulee') {
      throw new BadRequestException("Commande annulée — impossible d'encaisser");
    }
    if (Number(dto.montant_fcfa) !== Number(order.total_fcfa)) {
      throw new BadRequestException(
        `Montant incorrect — attendu ${order.total_fcfa} F, reçu ${dto.montant_fcfa} F`,
      );
    }

    const paymentId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO payments
         (id, order_id, montant_fcfa, methode, statut, confirme_le)
       VALUES ($1, $2, $3, $4, 'reussi', datetime('now'))`,
      [paymentId, dto.order_id, dto.montant_fcfa, dto.methode],
    );

    await this.pool.query(
      `UPDATE orders SET statut = 'payee', payee_le = datetime('now') WHERE id = $1`,
      [dto.order_id],
    );

    if (order.table_id) {
      await this.pool.query(
        `UPDATE tables SET statut = 'libre' WHERE id = $1`,
        [order.table_id],
      );
    }

    // Charge la commande à jour et notifie toutes les vues actives
    const updatedOrder = await this.orders.findOne(dto.order_id);
    this.gateway.emitOrderUpdate(updatedOrder);

    const paymentRes = await this.pool.query(
      `SELECT * FROM payments WHERE id = $1`,
      [paymentId],
    );

    return { payment: paymentRes.rows[0], order: updatedOrder };
  }

  async findByOrder(orderId: string) {
    const res = await this.pool.query(
      `SELECT * FROM payments WHERE order_id = $1 ORDER BY cree_le DESC`,
      [orderId],
    );
    return res.rows;
  }
}
