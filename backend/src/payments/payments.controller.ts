import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './payments.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles, CurrentUser, AuthUser } from '../auth/decorators';

@Controller('payments')
@UseGuards(JwtAuthGuard)
@Roles('caisse', 'gerant', 'admin')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  async record(@Body() dto: RecordPaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.record(dto, user);
  }

  @Get('order/:orderId')
  async findByOrder(@Param('orderId') orderId: string) {
    return this.payments.findByOrder(orderId);
  }
}
