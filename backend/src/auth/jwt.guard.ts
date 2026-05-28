import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;

    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant');
    }

    const token = auth.slice(7);
    try {
      req.user = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    // Vérification des rôles si décorateur @Roles présent
    const requiredRoles = this.reflector.get<string[]>('roles', ctx.getHandler());
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(req.user.role)) {
        throw new UnauthorizedException(`Rôle insuffisant. Requis : ${requiredRoles.join(', ')}`);
      }
    }

    return true;
  }
}
