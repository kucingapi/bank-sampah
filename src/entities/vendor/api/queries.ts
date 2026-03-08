import { getDb } from '@/shared/api';
import { generateId } from '@/shared/lib/id';
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
  const id = generateId();
  await db.execute('INSERT INTO vendor (id, name) VALUES (?, ?)', [id, name]);
  return { id, name };
}
