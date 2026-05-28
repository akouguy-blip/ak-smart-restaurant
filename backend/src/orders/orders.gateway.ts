import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

// Helper : si CORS_ORIGIN n'est pas défini OU vaut '*', on accepte toutes les origines.
// En single-service production, frontend et socket.io sont sur la même origine.
function corsOrigin(): any {
  const v = process.env.CORS_ORIGIN;
  if (!v || v === '*') return true;
  return v.split(',');
}

@WebSocketGateway({
  cors: {
    origin: corsOrigin(),
    credentials: true,
  },
})
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  // Push d'une nouvelle commande vers la cuisine.
  // En production, on filtre par room `restaurant:${id}` pour le multi-tenant.
  emitNewOrder(order: any) {
    const room = `restaurant:${order.restaurant_id}`;
    this.server.to(room).emit('order:new', order);
    // Broadcast global aussi (utile pour les démos / tests)
    this.server.emit('order:new', order);
  }

  emitOrderUpdate(order: any) {
    const room = `restaurant:${order.restaurant_id}`;
    this.server.to(room).emit('order:update', order);
    this.server.emit('order:update', order);
  }
}
