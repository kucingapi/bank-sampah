import { getDb } from '@/shared/api';
import type { Category } from '../model/types';

interface CategoryRow {
  id: string;
  name: string;
  unit: string;
  default_rate: number;
  status: string;
  archived: number;
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM category ORDER BY name ASC') as unknown as CategoryRow[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    default_rate: r.default_rate,
    status: r.status,
    archived: Boolean(r.archived),
  }));
}

export async function createCategory(id: string, name: string, unit: string, defaultRate: number, archived = false): Promise<Category> {
  const db = await getDb();

  await db.execute(
    'INSERT INTO category (id, name, unit, default_rate, status, archived) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, name, unit, defaultRate, 'active', archived ? 1 : 0]
  );

  return { id, name, unit, default_rate: defaultRate, status: 'active', archived };
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const db = await getDb();
  const setClauses: string[] = [];
  const args: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id') {
      const idx = args.length + 1;
      if (key === 'archived') {
        setClauses.push(`${key} = $${idx}`);
        args.push(value ? 1 : 0);
      } else {
        setClauses.push(`${key} = $${idx}`);
        args.push(value);
      }
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
