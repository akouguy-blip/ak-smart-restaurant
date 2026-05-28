import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export interface AuthUser {
  sub: string;        // user_id
  restaurant_id: string;
  role: string;
  nom: string;
  prenom?: string;
}

// @CurrentUser() → injecte le user authentifié dans le handler
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);

// @Roles('cuisine', 'gerant') → restreint l'accès par rôle
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
