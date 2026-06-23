import { getDb } from '@/shared/api';
import type { Deposit } from '../model/types';

export interface DepositItemWithDetails {
  category_id: string;
  category_name: string;
  weight: number;
  payout: number;
  unit: string;
  vendor_id: number;
  vendor_name: string | null;
}

export async function listDeposits(eventId?: string): Promise<(Deposit & {
  memberName: string;
  vendorName: string | null;
  itemCount?: number;
  items: DepositItemWithDetails[]
})[]> {
  const db = await getDb();
  let query = `
    SELECT d.id, d.event_id, d.member_id, d.vendor_id, d.time, d.total_payout,
           m.id as memberId,
           m.name as memberName,
           (SELECT COUNT(*) FROM deposit_item WHERE deposit_id = d.id) as itemCount,
           COALESCE(SUM(di.weight * er.active_rate), 0) as total_payout_calculated,
           (SELECT json_group_array(
             json_object(
               'category_id', di2.category_id,
               'category_name', c.name,
               'weight', di2.weight,
               'payout', di2.weight * er2.active_rate,
               'unit', c.unit,
               'vendor_id', di2.vendor_id,
               'vendor_name', (SELECT name FROM vendor WHERE id = di2.vendor_id)
             )
           )
           FROM deposit_item di2
           JOIN event_rate er2 ON er2.event_id = d.event_id AND er2.category_id = di2.category_id
           JOIN category c ON c.id = di2.category_id
           WHERE di2.deposit_id = d.id
           ) as items_json,
           (SELECT GROUP_CONCAT(DISTINCT v2.name)
            FROM deposit_item di3
            JOIN vendor v2 ON v2.id = di3.vendor_id
            WHERE di3.deposit_id = d.id
           ) as vendor_names
    FROM deposit d
    JOIN member m ON d.member_id = m.id
    LEFT JOIN deposit_item di ON di.deposit_id = d.id
    LEFT JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
  `;
  const args: (string | number)[] = [];

  if (eventId) {
    query += ' WHERE d.event_id = $1';
    args.push(eventId);
  }

  query += ' GROUP BY d.id ORDER BY d.time DESC';

  const results = await db.select<(Deposit & {
    memberName: string;
    itemCount?: number;
    total_payout_calculated: number;
    items_json: string | null;
    vendor_names: string | null;
  })[]>(query, args);

  return results.map(({ total_payout_calculated, items_json, vendor_names, ...rest }) => ({
    ...rest,
    vendorName: vendor_names || rest.vendor_id ? (vendor_names || null) : null,
    total_payout: total_payout_calculated,
    items: items_json ? JSON.parse(items_json) : [],
  }));
}

export async function getDepositWithItems(depositId: string): Promise<Deposit & {
  memberName: string;
  vendorName: string | null;
  items: { category_id: string; vendor_id: number; weight: number }[]
}> {
  const db = await getDb();

  const deposits = await db.select<(Deposit & { memberName: string })[]>(
    `SELECT d.*, m.name as memberName FROM deposit d JOIN member m ON d.member_id = m.id WHERE d.id = $1`,
    [depositId]
  );

  if (deposits.length === 0) throw new Error('Deposit not found');

  const items = await db.select<{ category_id: string; vendor_id: number; weight: number }[]>(
    `SELECT category_id, vendor_id, weight FROM deposit_item WHERE deposit_id = $1`,
    [depositId]
  );

  const vendorIds = Array.from(new Set(items.map(i => i.vendor_id)));
  const vendorNames = new Map<number, string>();
  if (vendorIds.length > 0) {
    const placeholders = vendorIds.map((_, i) => `$${i + 1}`).join(',');
    const rows = await db.select<{ id: number; name: string }[]>(
      `SELECT id, name FROM vendor WHERE id IN (${placeholders})`,
      vendorIds
    );
    rows.forEach(r => vendorNames.set(r.id, r.name));
  }

  const vendorName = Array.from(vendorNames.values()).join(', ') || null;

  return { ...deposits[0], vendorName, items };
}

export async function createDeposit(
  eventId: string,
  memberId: number,
  totalPayout: number,
  items: { categoryId: string; weight: number; vendorId: number }[]
): Promise<string> {
  const db = await getDb();
  const depositId = `dep-${Date.now().toString().slice(-6)}`;
  const primaryVendorId = items.length > 0 ? items[0].vendorId : null;

  await db.execute(
    'INSERT INTO deposit (id, event_id, member_id, vendor_id, time, total_payout) VALUES ($1, $2, $3, $4, $5, $6)',
    [depositId, eventId, memberId, primaryVendorId, new Date().toISOString(), totalPayout]
  );

  for (const item of items) {
    await db.execute(
      'INSERT INTO deposit_item (deposit_id, category_id, vendor_id, weight) VALUES ($1, $2, $3, $4)',
      [depositId, item.categoryId, item.vendorId, parseFloat(item.weight.toFixed(2))]
    );
  }

  return depositId;
}

export async function updateDeposit(
  depositId: string,
  memberId: number,
  totalPayout: number,
  items: { categoryId: string; weight: number; vendorId: number }[]
): Promise<void> {
  const db = await getDb();
  const primaryVendorId = items.length > 0 ? items[0].vendorId : null;

  await db.execute(
    'UPDATE deposit SET member_id = $1, vendor_id = $2, total_payout = $3 WHERE id = $4',
    [memberId, primaryVendorId, totalPayout, depositId]
  );

  await db.execute('DELETE FROM deposit_item WHERE deposit_id = $1', [depositId]);

  for (const item of items) {
    await db.execute(
      'INSERT INTO deposit_item (deposit_id, category_id, vendor_id, weight) VALUES ($1, $2, $3, $4)',
      [depositId, item.categoryId, item.vendorId, parseFloat(item.weight.toFixed(2))]
    );
  }
}