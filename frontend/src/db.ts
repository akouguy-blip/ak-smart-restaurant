import Dexie, { type Table } from 'dexie';

export interface MenuCacheEntry {
  table_numero: string;
  data: any;
  cached_at: number;
}

class AKDatabase extends Dexie {
  menu!: Table<MenuCacheEntry, string>;

  constructor() {
    super('ak_resto');
    this.version(1).stores({
      menu: 'table_numero',
    });
  }
}

export const db = new AKDatabase();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

export async function cacheMenu(tableNumero: string, data: any) {
  await db.menu.put({
    table_numero: tableNumero,
    data,
    cached_at: Date.now(),
  });
}

export async function getCachedMenu(tableNumero: string): Promise<any | null> {
  const entry = await db.menu.get(tableNumero);
  if (!entry) return null;
  if (Date.now() - entry.cached_at > CACHE_TTL_MS) return null;
  return entry.data;
}
