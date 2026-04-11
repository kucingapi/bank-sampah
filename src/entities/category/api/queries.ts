import { getDb } from '@/shared/api';
import type { Category } from '../model/types';

interface CategoryRow {
  id: string;
  name: string;
  unit: string;
  default_rate: number;
  buy_rate: number;
  status: string;
  archived: number;
  sort_order: number;
}

async function ensureSortOrderColumn() {
  const db = await getDb();
  try {
    await db.execute('ALTER TABLE category ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    const rows = await db.select<{ id: string }[]>('SELECT id FROM category');
    for (let i = 0; i < rows.length; i++) {
      await db.execute('UPDATE category SET sort_order = $1 WHERE id = $2', [i, rows[i].id]);
    }
  } catch {
    // Column already exists
  }
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  await ensureSortOrderColumn();
  const rows = await db.select('SELECT * FROM category ORDER BY sort_order ASC, name ASC') as unknown as CategoryRow[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    default_rate: r.default_rate,
    buy_rate: r.buy_rate ?? 0,
    status: r.status,
    archived: Boolean(r.archived),
    sort_order: r.sort_order ?? 0,
  }));
}

export async function createCategory(id: string, name: string, unit: string, defaultRate: number, buyRate: number, archived = false): Promise<Category> {
  const db = await getDb();
  await ensureSortOrderColumn();

  const maxOrder = await db.select<{ max_order: number }[]>('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM category');
  const nextOrder = (maxOrder[0]?.max_order ?? -1) + 1;

  await db.execute(
    'INSERT INTO category (id, name, unit, default_rate, buy_rate, status, archived, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, name, unit, defaultRate, buyRate, 'active', archived ? 1 : 0, nextOrder]
  );

  return { id, name, unit, default_rate: defaultRate, buy_rate: buyRate, status: 'active', archived, sort_order: nextOrder };
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
