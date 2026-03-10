import { getDb } from '@/shared/api';
import type { Deposit } from '../model/types';

export async function listDeposits(eventId?: string): Promise<(Deposit & { memberName: string; itemCount?: number })[]> {
  const db = await getDb();
  let query = `
    SELECT d.*, m.name as memberName,
    (SELECT COUNT(*) FROM deposit_item WHERE deposit_id = d.id) as itemCount
    FROM deposit d 
    JOIN member m ON d.member_id = m.id
  `;
  const args: any[] = [];
  
  if (eventId) {
    query += ' WHERE d.event_id = $1';
    args.push(eventId);
  }
  
  query += ' ORDER BY d.time DESC';
  
  return db.select<(Deposit & { memberName: string; itemCount?: number })[]>(query, args);
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
