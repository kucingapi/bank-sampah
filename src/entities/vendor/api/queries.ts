import { getDb } from '@/shared/api';
import type { Vendor } from '../model/types';

export async function listVendors(search?: string): Promise<Vendor[]> {
  const db = await getDb();
  if (search) {
    return await db.select<Vendor[]>('SELECT * FROM vendor WHERE name LIKE ? ORDER BY name ASC', [`%${search}%`]);
  }
  return await db.select<Vendor[]>('SELECT * FROM vendor ORDER BY name ASC');
}

export async function createVendor(name: string): Promise<Vendor> {
  const db = await getDb();
  const result = await db.execute('INSERT INTO vendor (name) VALUES (?)', [name]);
  const id = result.lastInsertId;
  return { id: Number(id), name };
}

export async function deleteVendor(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM vendor WHERE id = ?', [id]);
}

export async function getOrCreateDefaultVendors(): Promise<{ bsm: Vendor; lainnya: Vendor }> {
  const db = await getDb();
  await db.execute('INSERT OR IGNORE INTO vendor (name) VALUES (?)', ['BSM']);
  await db.execute('INSERT OR IGNORE INTO vendor (name) VALUES (?)', ['Lainnya']);
  
  const existing = await db.select<Vendor[]>('SELECT * FROM vendor WHERE name IN (?, ?)', ['BSM', 'Lainnya']);
  
  const bsm = existing.find(v => v.name === 'BSM')!;
  const lainnya = existing.find(v => v.name === 'Lainnya')!;
  
  return { bsm, lainnya };
}
