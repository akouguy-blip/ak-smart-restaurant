import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/decorators';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles('gerant', 'admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ====== Tables / QR ======
  @Get('tables')
  listTables() {
    return this.admin.listTablesWithQR();
  }

  @Post('tables/:id/regen-qr')
  regenQR(@Param('id') id: string) {
    return this.admin.regenerateTableQR(id);
  }

  // ====== Stats ======
  @Get('stats/today')
  todayStats() {
    return this.admin.getTodayStats();
  }

  // ====== Menu (CRUD) ======
  @Get('menu')
  listMenu() {
    return this.admin.listMenuAdmin();
  }

  @Post('menu/items')
  createItem(@Body() dto: any) {
    return this.admin.createItem(dto);
  }

  @Patch('menu/items/:id')
  updateItem(@Param('id') id: string, @Body() dto: any) {
    return this.admin.updateItem(id, dto);
  }

  @Delete('menu/items/:id')
  deleteItem(@Param('id') id: string) {
    return this.admin.deleteItem(id);
  }

  @Post('menu/categories')
  createCategory(@Body() dto: any) {
    return this.admin.createCategory(dto);
  }

  @Patch('menu/categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: any) {
    return this.admin.updateCategory(id, dto);
  }

  @Delete('menu/categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }
}
