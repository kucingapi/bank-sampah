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
  
  await syncEventRates(id);
  
  return { id, event_date: date, status: 'active' };
}

export async function updateEventStatus(id: string, status: 'active' | 'finished'): Promise<void> {
  const db = await getDb();
  
  if (status === 'active') {
    const events = await db.select<{ status: string }[]>(
      'SELECT status FROM event WHERE id = $1',
      [id]
    );
    if (events.length > 0 && events[0].status === 'finished') {
      await db.execute(
        `DELETE FROM manifest_item WHERE manifest_id IN (SELECT id FROM vendor_manifest WHERE event_id = $1)`,
        [id]
      );
      await db.execute('DELETE FROM vendor_manifest WHERE event_id = $1', [id]);
    }
  }
  
  await db.execute('UPDATE event SET status = $1 WHERE id = $2', [status, id]);
}

export async function syncEventRates(eventId: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM event_rate WHERE event_id = $1', [eventId]);
  
  const categories = await db.select<{id: string, default_rate: number}[]>(
    "SELECT id, default_rate FROM category"
  );
  
  for (const cat of categories) {
    await db.execute(
      'INSERT INTO event_rate (event_id, category_id, active_rate, is_active) VALUES ($1, $2, $3, 1)',
      [eventId, cat.id, cat.default_rate]
    );
  }
}

export async function getEventRates(eventId: string): Promise<(EventRate & { is_active: number })[]> {
  const db = await getDb();
  return db.select<(EventRate & { is_active: number })[]>(
    'SELECT * FROM event_rate WHERE event_id = $1',
    [eventId]
  );
}

export async function updateEventRate(eventId: string, categoryId: string, activeRate: number, isActive: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    'UPDATE event_rate SET active_rate = $1, is_active = $2 WHERE event_id = $3 AND category_id = $4',
    [activeRate, isActive, eventId, categoryId]
  );
}

export async function getEventCategoryTotals(eventId: string): Promise<{categoryId: string, totalWeight: number, totalPayout: number}[]> {
  const db = await getDb();
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
  
  const manifestId = `mft-${Date.now().toString().slice(-6)}`;
  await db.execute(
    'INSERT INTO vendor_manifest (id, event_id, vendor_id) VALUES ($1, $2, $3)',
    [manifestId, eventId, assignments[0]?.vendorId || '']
  );
  
  for (const a of assignments) {
    await db.execute(
      'INSERT INTO manifest_item (manifest_id, category_id, outbound_rate) VALUES ($1, $2, $3)', 
      [manifestId, a.categoryId, 0]
    );
  }
}
