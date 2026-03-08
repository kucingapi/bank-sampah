import { getDb } from '@/shared/api';
import type { Category } from '../model/types';

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return await db.select<Category[]>('SELECT * FROM category ORDER BY name ASC');
}

export async function createCategory(id: string, name: string, unit: string, default_rate: number): Promise<Category> {
  const db = await getDb();
  
  await db.execute(
    'INSERT INTO category (id, name, unit, default_rate, status) VALUES ($1, $2, $3, $4, $5)',
    [id, name, unit, default_rate, 'active']
  );
  
  return { id, name, unit, default_rate, status: 'active' };
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const db = await getDb();
  const setClauses: string[] = [];
  const args: any[] = [];
  
  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id') {
      const idx = args.length + 1;
      setClauses.push(`${key} = $${idx}`);
      args.push(value);
    }
  });
  
  if (setClauses.length === 0) return;
  
  args.push(id);
  const idIdx = args.length;
  await db.execute(`UPDATE category SET ${setClauses.join(', ')} WHERE id = $${idIdx}`, args);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM category WHERE id = $1', [id]);
}
