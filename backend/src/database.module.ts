import { Global, Module, Logger, OnModuleInit, Inject, Injectable } from '@nestjs/common';
import Database = require('better-sqlite3');
import * as fs from 'fs';
import * as path from 'path';

export const PG_POOL = 'PG_POOL';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

/**
 * Wrapper better-sqlite3 → API "pool.query()" promise-based.
 *
 * Convertit les placeholders $1, $2 (style pg) en ? simples (style SQLite),
 * en réordonnant les params pour respecter l'ordre d'apparition.
 */
export class SqliteAdapter {
  private readonly db: Database.Database;
  private readonly logger = new Logger('SqliteAdapter');

  constructor(filepath: string) {
    this.logger.log(`Ouverture de la base SQLite : ${filepath}`);
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(filepath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');
  }

  get raw(): Database.Database {
    return this.db;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const { sql: converted, params: queryParams } = this.prepareQuery(sql, params);
    const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(converted);
    const hasReturning = /RETURNING\s+/i.test(converted);

    try {
      if (isSelect) {
        const stmt = this.db.prepare(converted);
        const rows = stmt.all(...queryParams) as T[];
        return { rows, rowCount: rows.length };
      }

      if (hasReturning) {
        const stmt = this.db.prepare(converted);
        try {
          const rows = stmt.all(...queryParams) as T[];
          return { rows, rowCount: rows.length };
        } catch {
          const noReturning = converted.replace(/\s+RETURNING\s+[\s\S]*$/i, '');
          const stmt2 = this.db.prepare(noReturning);
          const info = stmt2.run(...queryParams);
          return { rows: [], rowCount: info.changes };
        }
      }

      // INSERT/UPDATE/DELETE
      if (this.hasMultipleStatements(converted)) {
        this.db.exec(converted);
        return { rows: [], rowCount: 0 };
      }
      const stmt = this.db.prepare(converted);
      const info = stmt.run(...queryParams);
      return { rows: [], rowCount: info.changes };
    } catch (err: any) {
      this.logger.error(`SQL ERROR: ${err.message}\nSQL: ${converted}\nPARAMS: ${JSON.stringify(queryParams)}`);
      throw this.convertError(err);
    }
  }

  close() {
    this.db.close();
  }

  /**
   * Convertit "$1, $2, ..." → "?, ?, ..." et réordonne les params
   * pour respecter l'ordre d'apparition réel dans la requête.
   * Permet aussi qu'un même $N apparaisse plusieurs fois.
   */
  private prepareQuery(sql: string, params: any[]): { sql: string; params: any[] } {
    if (!sql.includes('$')) {
      return { sql, params: this.normalize(params) };
    }

    const matches = [...sql.matchAll(/\$(\d+)/g)];
    if (matches.length === 0) {
      return { sql, params: this.normalize(params) };
    }

    // Réordonner les params selon l'ordre d'apparition dans le SQL
    const ordered = matches.map((m) => params[parseInt(m[1], 10) - 1]);
    const newSql = sql.replace(/\$\d+/g, '?');

    return { sql: newSql, params: this.normalize(ordered) };
  }

  private normalize(params: any[]): any[] {
    return params.map((p) => {
      if (p === undefined || p === null) return null;
      if (p === true) return 1;
      if (p === false) return 0;
      if (p instanceof Date) return p.toISOString();
      if (Array.isArray(p)) return JSON.stringify(p);
      if (typeof p === 'object') return JSON.stringify(p);
      return p;
    });
  }

  private hasMultipleStatements(sql: string): boolean {
    const cleaned = sql.replace(/'[^']*'/g, "''").replace(/--.*$/gm, '');
    const semis = (cleaned.match(/;/g) || []).length;
    return semis > 1;
  }

  private convertError(err: any): Error {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      const e: any = new Error(err.message);
      e.code = '23503';
      return e;
    }
    if (
      err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
    ) {
      const e: any = new Error(err.message);
      e.code = '23505';
      return e;
    }
    return err;
  }
}

@Injectable()
export class SetupService implements OnModuleInit {
  private readonly logger = new Logger(SetupService.name);

  constructor(@Inject(PG_POOL) private readonly db: SqliteAdapter) {}

  async onModuleInit() {
    try {
      const res = await this.db.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='restaurants'`,
      );
      if (res.rows.length > 0) {
        this.logger.log('Base SQLite déjà initialisée.');
        return;
      }
      this.logger.log('Première initialisation de la base SQLite…');
      const initPath = this.findInit();
      if (!initPath) {
        this.logger.error('init.sqlite.sql introuvable !');
        return;
      }
      const sql = fs.readFileSync(initPath, 'utf8');
      this.db.raw.exec(sql);
      this.logger.log('✓ Schéma + données seed installés.');
    } catch (err: any) {
      this.logger.error(`Échec init : ${err.message}`);
    }
  }

  private findInit(): string | null {
    const candidates = [
      path.join(__dirname, '..', 'db', 'init.sqlite.sql'),
      path.join(process.cwd(), 'db', 'init.sqlite.sql'),
      path.join(__dirname, '..', '..', 'db', 'init.sqlite.sql'),
    ];
    return candidates.find((p) => fs.existsSync(p)) || null;
  }
}

function dbFilePath(): string {
  const fromEnv = process.env.SQLITE_PATH || process.env.DATABASE_FILE;
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), 'akresto.db');
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new SqliteAdapter(dbFilePath()),
    },
    SetupService,
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
