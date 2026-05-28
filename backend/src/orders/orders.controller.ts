import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './orders.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly gateway: OrdersGateway,
  ) {}

  // PUBLIC : utilisé par les clients après scan QR
  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.orders.create(dto);
    this.gateway.emitNewOrder(order);
    return order;
  }

  // PUBLIC : suivi par le client de sa propre commande
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  // PROTÉGÉ : liste des commandes actives (cuisine + caisse + gérant)
  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles('cuisine', 'caisse', 'gerant', 'admin')
  async findActive() {
    return this.orders.findActive();
  }

  // PROTÉGÉ : transition de statut (cuisine + caisse + gérant)
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @Roles('cuisine', 'caisse', 'gerant', 'admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { statut: string },
    @CurrentUser() user: AuthUser,
  ) {
    const order = await this.orders.updateStatus(id, body.statut);
    this.gateway.emitOrderUpdate(order);
    return order;
  }
}
