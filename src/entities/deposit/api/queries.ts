import { getDb } from '@/shared/api';
import type { Deposit } from '../model/types';

export async function listDeposits(eventId?: string): Promise<(Deposit & { memberName: string })[]> {
  const db = await getDb();
  let query = `
    SELECT d.*, m.name as memberName 
    FROM deposit d 
    JOIN member m ON d.member_id = m.id
  `;
  const args: any[] = [];
  
  if (eventId) {
    query += ' WHERE d.event_id = $1';
    args.push(eventId);
  }
  
  query += ' ORDER BY d.time DESC';
  
  return db.select<(Deposit & { memberName: string })[]>(query, args);
}

export async function createDeposit(
  eventId: string, 
  memberId: string, 
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
