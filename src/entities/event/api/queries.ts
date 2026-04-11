import { getDb } from '@/shared/api';
import type { Event, EventRate } from '../model/types';

/** Ensure the outbound_rate column exists (handles old databases pre-migration) */
async function ensureOutboundRateColumn() {
  const db = await getDb();
  let justAdded = false;
  try {
    await db.execute('ALTER TABLE event_rate ADD COLUMN outbound_rate REAL NOT NULL DEFAULT 0');
    justAdded = true;
  } catch {
    // Column already exists, ignore
  }

  // Backfill existing rows with sell rate = buy_rate * 1.10
  if (justAdded) {
    const rows = await db.select<{ event_id: string; category_id: string; active_rate: number }[]>(
      'SELECT event_id, category_id, active_rate FROM event_rate'
    );
    for (const row of rows) {
      const sellRate = Math.round(row.active_rate * 1.10);
      const buyRate = Math.round(sellRate * 0.90);
      await db.execute(
        'UPDATE event_rate SET active_rate = $1, outbound_rate = $2 WHERE event_id = $3 AND category_id = $4',
        [buyRate, sellRate, row.event_id, row.category_id]
      );
    }
  }
}

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
    // Check if there's already another active session
    const activeEvents = await db.select<{ id: string }[]>(
      'SELECT id FROM event WHERE status = $1 AND id != $2',
      ['active', id]
    );
    if (activeEvents.length > 0) {
      throw new Error('Sesi aktif lain masih berjalan. Selesaikan sesi tersebut terlebih dahulu.');
    }

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
  await ensureOutboundRateColumn();
  await db.execute('DELETE FROM event_rate WHERE event_id = $1', [eventId]);

  const categories = await db.select<{id: string, default_rate: number, archived: number}[]>(
    "SELECT id, default_rate, archived FROM category"
  );

  for (const cat of categories) {
    const sellRate = cat.default_rate;
    const buyRate = Math.round(sellRate * 0.90); // 10% below sell
    const isActive = cat.archived ? 0 : 1; // archived → inactive for new sessions
    await db.execute(
      'INSERT INTO event_rate (event_id, category_id, active_rate, outbound_rate, is_active) VALUES ($1, $2, $3, $4, $5)',
      [eventId, cat.id, buyRate, sellRate, isActive]
    );
  }
}

export async function getEventRates(eventId: string): Promise<(EventRate & { is_active: number })[]> {
  const db = await getDb();
  await ensureOutboundRateColumn();
  const rows = await db.select<{ event_id: string; category_id: string; active_rate: number; outbound_rate?: number; is_active: number }[]>(
    'SELECT * FROM event_rate WHERE event_id = $1',
    [eventId]
  );
  return rows.map(r => ({
    event_id: r.event_id,
    category_id: r.category_id,
    active_rate: r.active_rate,
    outbound_rate: r.outbound_rate ?? 0,
    is_active: r.is_active,
  }));
}

export async function updateEventRate(eventId: string, categoryId: string, activeRate: number, outboundRate: number, isActive: number): Promise<void> {
  const db = await getDb();
  await ensureOutboundRateColumn();
  await db.execute(
    'UPDATE event_rate SET active_rate = $1, outbound_rate = $2, is_active = $3 WHERE event_id = $4 AND category_id = $5',
    [activeRate, outboundRate, isActive, eventId, categoryId]
  );
}

export async function getEventCategoryTotals(eventId: string): Promise<{categoryId: string, totalWeight: number, totalPayout: number, totalSellPayout: number}[]> {
  const db = await getDb();
  await ensureOutboundRateColumn();
  const res = await db.select<{category_id: string, total_weight: number, active_rate: number, outbound_rate: number}[]>(`
    SELECT
      di.category_id,
      SUM(di.weight) as total_weight,
      er.active_rate,
      er.outbound_rate
    FROM deposit_item di
    JOIN deposit d ON di.deposit_id = d.id
    JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
    WHERE d.event_id = $1
    GROUP BY di.category_id, er.active_rate, er.outbound_rate
  `, [eventId]);

  return res.map(r => ({
    categoryId: r.category_id,
    totalWeight: r.total_weight,
    totalPayout: r.total_weight * r.active_rate,
    totalSellPayout: r.total_weight * r.outbound_rate
  }));
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDb();

  // Delete manifest items
  await db.execute(
    `DELETE FROM manifest_item WHERE manifest_id IN (SELECT id FROM vendor_manifest WHERE event_id = $1)`,
    [id]
  );

  // Delete vendor manifests
  await db.execute('DELETE FROM vendor_manifest WHERE event_id = $1', [id]);

  // Delete deposit items
  await db.execute(
    `DELETE FROM deposit_item WHERE deposit_id IN (SELECT id FROM deposit WHERE event_id = $1)`,
    [id]
  );

  // Delete deposits
  await db.execute('DELETE FROM deposit WHERE event_id = $1', [id]);

  // Delete event rates
  await db.execute('DELETE FROM event_rate WHERE event_id = $1', [id]);

  // Delete event
  await db.execute('DELETE FROM event WHERE id = $1', [id]);
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
