import { Inject, Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PG_POOL } from '../database.module';

const DEMO_RESTAURANT_ID = '00000000-0000-0000-0000-000000000001';

const DEMO_STAFF = [
  { id: 'user-cuisine-001', nom: 'Aïsha',   prenom: 'Chef',    role: 'cuisine', pin: '1234' },
  { id: 'user-caisse-001',  nom: 'Konan',   prenom: 'Aline',   role: 'caisse',  pin: '5678' },
  { id: 'user-gerant-001',  nom: 'Touré',   prenom: 'Yacouba', role: 'gerant',  pin: '9999' },
];

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: any,
    private readonly jwt: JwtService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const res = await this.pool.query(
        `SELECT COUNT(*) AS n FROM users
          WHERE restaurant_id = $1 AND pin_hash IS NOT NULL`,
        [DEMO_RESTAURANT_ID],
      );
      if (Number(res.rows[0].n) > 0) return;

      this.logger.log('Création des comptes de démo avec PINs hashés…');
      for (const u of DEMO_STAFF) {
        const pin_hash = await bcrypt.hash(u.pin, 10);
        // INSERT OR REPLACE plutôt qu'ON CONFLICT (SQLite syntax)
        await this.pool.query(
          `INSERT OR REPLACE INTO users (id, restaurant_id, nom, prenom, role, pin_hash, actif)
           VALUES ($1, $2, $3, $4, $5, $6, 1)`,
          [u.id, DEMO_RESTAURANT_ID, u.nom, u.prenom, u.role, pin_hash],
        );
      }
      this.logger.log(
        `Comptes prêts : ${DEMO_STAFF.map((u) => `${u.prenom} ${u.nom} [${u.role}] PIN ${u.pin}`).join(' · ')}`,
      );
    } catch (err: any) {
      this.logger.warn(`Bootstrap users skipped: ${err.message}`);
    }
  }

  async listStaff() {
    const res = await this.pool.query(
      `SELECT id, nom, prenom, role
         FROM users
        WHERE restaurant_id = $1
          AND actif = 1
          AND pin_hash IS NOT NULL
        ORDER BY role, nom`,
      [DEMO_RESTAURANT_ID],
    );
    return res.rows;
  }

  async loginWithPin(userId: string, pin: string) {
    const res = await this.pool.query(
      `SELECT id, restaurant_id, nom, prenom, role, pin_hash
         FROM users
        WHERE id = $1 AND actif = 1`,
      [userId],
    );
    if (res.rowCount === 0 || !res.rows[0].pin_hash) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const user = res.rows[0];
    const ok = await bcrypt.compare(pin, user.pin_hash);
    if (!ok) throw new UnauthorizedException('Code PIN incorrect');

    const payload = {
      sub: user.id,
      restaurant_id: user.restaurant_id,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    };
    const token = await this.jwt.signAsync(payload);

    return {
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, role: user.role },
    };
  }
}
