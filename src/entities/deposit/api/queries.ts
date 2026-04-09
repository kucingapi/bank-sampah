import { getDb } from '@/shared/api';
import type { Deposit } from '../model/types';

export async function listDeposits(eventId?: string): Promise<(Deposit & {
  memberName: string;
  itemCount?: number;
  items: { category_id: string; category_name: string; weight: number; payout: number; unit: string }[]
})[]> {
  const db = await getDb();
  let query = `
    SELECT d.id, d.event_id, d.member_id, d.time, d.total_payout,
           m.name as memberName,
           (SELECT COUNT(*) FROM deposit_item WHERE deposit_id = d.id) as itemCount,
           COALESCE(SUM(di.weight * er.active_rate), 0) as total_payout_calculated,
           (SELECT json_group_array(
             json_object(
               'category_id', di2.category_id,
               'category_name', c.name,
               'weight', di2.weight,
               'payout', di2.weight * er2.active_rate,
               'unit', c.unit
             )
           )
           FROM deposit_item di2
           JOIN event_rate er2 ON er2.event_id = d.event_id AND er2.category_id = di2.category_id
           JOIN category c ON c.id = di2.category_id
           WHERE di2.deposit_id = d.id
           ) as items_json
    FROM deposit d
    JOIN member m ON d.member_id = m.id
    LEFT JOIN deposit_item di ON di.deposit_id = d.id
    LEFT JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
  `;
  const args: any[] = [];

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
  })[]>(query, args);

  // Override total_payout with the calculated value and parse items JSON
  return results.map(({ total_payout_calculated, items_json, ...rest }) => ({
    ...rest,
    total_payout: total_payout_calculated,
    items: items_json ? JSON.parse(items_json) : [],
  }));
}

export async function getDepositWithItems(depositId: string): Promise<Deposit & { memberName: string; items: { category_id: string; weight: number }[] }> {
  const db = await getDb();
  
  const deposits = await db.select<(Deposit & { memberName: string })[]>(
    `SELECT d.*, m.name as memberName FROM deposit d JOIN member m ON d.member_id = m.id WHERE d.id = $1`,
    [depositId]
  );
  
  if (deposits.length === 0) throw new Error('Deposit not found');
  
  const items = await db.select<{ category_id: string; weight: number }[]>(
    `SELECT category_id, weight FROM deposit_item WHERE deposit_id = $1`,
    [depositId]
  );
  
  return { ...deposits[0], items };
}

export async function createDeposit(
  eventId: string, 
  memberId: number, 
  totalPayout: number,
  items: { categoryId: string, weight: number }[]
): Promise<string> {
  const db = await getDb();
  const depositId = `dep-${Date.now().toString().slice(-6)}`;
  
  // Insert Main Deposit
  await db.execute(
    'INSERT INTO deposit (id, event_id, member_id, time, total_payout) VALUES ($1, $2, $3, $4, $5)',
    [depositId, eventId, memberId, new Date().toISOString(), totalPayout]
  );
  
  // Insert Items
  for (const item of items) {
    await db.execute(
      'INSERT INTO deposit_item (deposit_id, category_id, weight) VALUES ($1, $2, $3)',
      [depositId, item.categoryId, item.weight]
    );
  }
  
  return depositId;
}

export async function updateDeposit(
  depositId: string,
  memberId: number, 
  totalPayout: number,
  items: { categoryId: string; weight: number }[]
): Promise<void> {
  const db = await getDb();
  
  // Update main deposit
  await db.execute(
    'UPDATE deposit SET member_id = $1, total_payout = $2 WHERE id = $3',
    [memberId, totalPayout, depositId]
  );
  
  // Delete existing items
  await db.execute('DELETE FROM deposit_item WHERE deposit_id = $1', [depositId]);
  
  // Insert updated items
  for (const item of items) {
    await db.execute(
      'INSERT INTO deposit_item (deposit_id, category_id, weight) VALUES ($1, $2, $3)',
      [depositId, item.categoryId, item.weight]
    );
  }
}
