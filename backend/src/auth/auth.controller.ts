import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { CurrentUser, AuthUser } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Liste publique du staff (pour le picker de login)
  @Get('staff')
  listStaff() {
    return this.auth.listStaff();
  }

  // Login PIN
  @Post('login-pin')
  async loginPin(@Body() body: { user_id?: string; pin?: string }) {
    if (!body?.user_id || !body?.pin) {
      throw new UnauthorizedException('user_id et pin requis');
    }
    return this.auth.loginWithPin(body.user_id, body.pin);
  }

  // Récupération du profil courant (validation du token)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
