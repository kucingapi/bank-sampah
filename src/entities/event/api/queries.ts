import { getDb } from '@/shared/api';
import type { Event, EventRate } from '../model/types';

export async function listEvents(): Promise<Event[]> {
  const db = await getDb();
  return db.select<Event[]>('SELECT * FROM event ORDER BY event_date DESC');
}

export async function getEvent(id: string): Promise<Event> {
  const db = await getDb();
  const res = await db.select<Event[]>('SELECT * FROM event WHERE id = $1', [id]);
  if (res.length === 0) throw new Error('Event not found');
  return res[0];
}

export async function createEvent(date: string): Promise<Event> {
  const db = await getDb();
  const id = `evt-${Date.now().toString().slice(-6)}`;
  await db.execute(
    'INSERT INTO event (id, event_date, status) VALUES ($1, $2, $3)',
    [id, date, 'active']
  );
  
  // Create an initial empty sync of base rates
  await syncEventRates(id);
  
  return { id, event_date: date, status: 'active' };
}

export async function updateEventStatus(id: string, status: 'active' | 'finished'): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE event SET status = $1 WHERE id = $2', [status, id]);
}

export async function syncEventRates(eventId: string): Promise<void> {
  const db = await getDb();
  // Clear any existing rates for safety before a full sync
  await db.execute('DELETE FROM event_rate WHERE event_id = $1', [eventId]);
  
  // Fetch active categories
  const categories = await db.select<{id: string, default_rate: number}[]>(
    "SELECT id, default_rate FROM category WHERE status = 'active'"
  );
  
  // Insert new snapshot
  for (const cat of categories) {
    await db.execute(
      'INSERT INTO event_rate (event_id, category_id, active_rate) VALUES ($1, $2, $3)',
      [eventId, cat.id, cat.default_rate]
    );
  }
}

export async function getEventRates(eventId: string): Promise<EventRate[]> {
  const db = await getDb();
  return db.select<EventRate[]>('SELECT * FROM event_rate WHERE event_id = $1', [eventId]);
}

export async function getEventCategoryTotals(eventId: string): Promise<{categoryId: string, totalWeight: number, totalPayout: number}[]> {
  const db = await getDb();
  // Aggregate deposit items by category for a specific event
  const res = await db.select<{category_id: string, total_weight: number, active_rate: number}[]>(`
    SELECT 
      di.category_id, 
      SUM(di.weight) as total_weight,
      er.active_rate
    FROM deposit_item di
    JOIN deposit d ON di.deposit_id = d.id
    JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
    WHERE d.event_id = $1
    GROUP BY di.category_id, er.active_rate
  `, [eventId]);

  return res.map(r => ({
    categoryId: r.category_id,
    totalWeight: r.total_weight,
    totalPayout: r.total_weight * r.active_rate
  }));
}

export async function createManifest(eventId: string, assignments: {categoryId: string, vendorId: string}[]): Promise<void> {
  const db = await getDb();
  
  // Here we'd typically have a `manifest` and `manifest_item` table.
  // We'll simulate creating the manifest by inserting into the DB.
  // To keep schema minimal per instructions, we map it into an existing or new table structure.
  // For the sake of this prompt, we execute discrete DB transactions.
  
  const manifestId = `mft-${Date.now().toString().slice(-6)}`;
  await db.execute('INSERT INTO manifest (id, event_id, created_at) VALUES ($1, $2, $3)', [manifestId, eventId, new Date().toISOString()]);
  
  for (const a of assignments) {
    await db.execute(
      'INSERT INTO manifest_item (manifest_id, category_id, vendor_id) VALUES ($1, $2, $3)', 
      [manifestId, a.categoryId, a.vendorId]
    );
  }
}
