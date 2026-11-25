import { openDB, type IDBPDatabase } from 'idb';
import type { Timesheet } from './model';

const DB_NAME = 'hourtally';
const VERSION = 1;
let dbp: Promise<IDBPDatabase> | null = null;
/** True when IndexedDB is unavailable (some private modes). Data then lives in memory only. */
export let memoryOnly = false;
const mem = { sheets: new Map<string, Timesheet>(), meta: new Map<string, unknown>() };

function db(): Promise<IDBPDatabase> | null {
  if (memoryOnly) return null;
  if (typeof indexedDB === 'undefined') { memoryOnly = true; return null; }
  if (!dbp) {
    dbp = openDB(DB_NAME, VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('sheets')) d.createObjectStore('sheets', { keyPath: 'id' }).createIndex('updatedAt', 'updatedAt');
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      },
    }).catch((e) => { memoryOnly = true; dbp = null; throw e; });
  }
  return dbp;
}

async function withDb<T>(fn: (d: IDBPDatabase) => Promise<T>, fallback: () => T): Promise<T> {
  const p = db();
  if (!p) return fallback();
  try { return await fn(await p); } catch { memoryOnly = true; return fallback(); }
}

export const saveSheet = (ts: Timesheet) =>
  withDb(async (d) => { await d.put('sheets', ts); }, () => { mem.sheets.set(ts.id, ts); });

export const getSheet = (id: string) =>
  withDb(async (d) => (await d.get('sheets', id)) as Timesheet | undefined, () => mem.sheets.get(id));

export const deleteSheet = (id: string) =>
  withDb(async (d) => { await d.delete('sheets', id); }, () => { mem.sheets.delete(id); });

export const listSheets = () =>
  withDb(async (d) => ((await d.getAll('sheets')) as Timesheet[]).sort((a, b) => b.updatedAt - a.updatedAt),
    () => [...mem.sheets.values()].sort((a, b) => b.updatedAt - a.updatedAt));

export const getMeta = <T>(key: string) =>
  withDb(async (d) => (await d.get('meta', key)) as T | undefined, () => mem.meta.get(key) as T | undefined);

export const setMeta = (key: string, value: unknown) =>
  withDb(async (d) => { await d.put('meta', value, key); }, () => { mem.meta.set(key, value); });

/** Ask the browser not to evict our data under storage pressure (best effort). */
export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}

export type Backup = { app: 'hourtally'; version: 1; exportedAt: string; sheets: Timesheet[] };

export async function exportBackup(): Promise<Backup> {
  return { app: 'hourtally', version: 1, exportedAt: new Date().toISOString(), sheets: await listSheets() };
}

/** Imports sheets from a backup file; returns how many were imported. Existing ids are overwritten. */
export async function importBackup(json: string): Promise<number> {
  const o = JSON.parse(json);
  if (!o || o.app !== 'hourtally' || !Array.isArray(o.sheets)) throw new Error('This file is not an HourTally backup.');
  let n = 0;
  for (const s of o.sheets) {
    if (s && typeof s.id === 'string' && typeof s.startDate === 'string' && Array.isArray(s.days) && s.settings) {
      await saveSheet(s as Timesheet);
      n++;
    }
  }
  return n;
}
