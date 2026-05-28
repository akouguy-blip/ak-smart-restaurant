import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  // Endpoint public utilisé par le client après scan QR.
  // La signature est optionnelle en dev. En production elle est obligatoire.
  @Get('public/:tableNumero')
  async getPublicMenu(
    @Param('tableNumero') tableNumero: string,
    @Query('sig') signature?: string,
  ) {
    const result = await this.menu.getPublicMenuForTable(tableNumero, signature);
    if (!result) {
      throw new NotFoundException('Table introuvable ou QR invalide');
    }
    return result;
  }
}
