import { getDb } from '@/shared/api';
import type { Member } from '../model/types';

export async function listMembers(
  search?: string, 
  eventDateStart?: string, 
  eventDateEnd?: string
): Promise<(Member & { totalEarnings: number })[]> {
  const db = await getDb();
  let query = `
    SELECT 
      m.*,
      COALESCE(SUM(d.total_payout), 0) as totalEarnings
    FROM member m
    LEFT JOIN deposit d ON m.id = d.member_id
    LEFT JOIN event e ON d.event_id = e.id
    WHERE 1=1
  `;
  const args: any[] = [];
  
  if (eventDateStart && eventDateEnd) {
    const idx1 = args.length + 1;
    const idx2 = args.length + 2;
    query += ` AND e.event_date BETWEEN $${idx1} AND $${idx2}`;
    args.push(eventDateStart, eventDateEnd);
  }
  
  if (search) {
    query += ' AND m.name LIKE $' + (args.length + 1);
    args.push(`%${search}%`);
  }
  
  if (eventDateStart && eventDateEnd) {
    query += ' GROUP BY m.id HAVING SUM(d.total_payout) > 0 ORDER BY m.join_date DESC';
  } else {
    query += ' GROUP BY m.id ORDER BY m.join_date DESC';
  }
  
  return await db.select<(Member & { totalEarnings: number })[]>(query, args);
}

export async function exportDetailedMemberList(eventDateStart?: string, eventDateEnd?: string): Promise<string> {
  const db = await getDb();
  
  let query = `
    SELECT 
      m.name as memberName,
      m.id as memberId,
      e.event_date as eventDate,
      c.name as categoryName,
      di.weight as weight,
      (di.weight * er.active_rate) as payout
    FROM deposit d
    JOIN member m ON d.member_id = m.id
    JOIN event e ON d.event_id = e.id
    JOIN deposit_item di ON d.id = di.deposit_id
    JOIN category c ON di.category_id = c.id
    JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
  `;
  
  const args: any[] = [];
  
  if (eventDateStart && eventDateEnd) {
    const idx1 = args.length + 1;
    const idx2 = args.length + 2;
    query += ` WHERE e.event_date BETWEEN $${idx1} AND $${idx2}`;
    args.push(eventDateStart, eventDateEnd);
  }
  
  query += ' ORDER BY e.event_date DESC, m.name ASC, c.name ASC';
  
  const rows = await db.select<{
    memberName: string;
    memberId: number;
    eventDate: string;
    categoryName: string;
    weight: number;
    payout: number;
  }[]>(query, args);
  
  const headers = ['Nama Anggota', 'ID Nasabah', 'Tanggal Sesi', 'Kategori', 'Berat (Kg)', 'Pembayaran (Rp)'];
  const csvRows = [headers.join(',')];
  
  for (const row of rows) {
    csvRows.push([
      `"${row.memberName}"`,
      row.memberId,
      new Date(row.eventDate).toLocaleDateString('id-ID'),
      `"${row.categoryName}"`,
      row.weight.toFixed(2),
      row.payout.toFixed(0)
    ].join(','));
  }
  
  return csvRows.join('\n');
}

export async function createMember(name: string): Promise<Member> {
  const db = await getDb();
  const joinDate = new Date().toISOString();
  
  const result = await db.execute('INSERT INTO member (name, join_date) VALUES (?, ?)', [name, joinDate]);
  
  const lastId = result.lastInsertId;
  if (lastId === undefined) {
    throw new Error('Failed to create member');
  }
  
  return { id: lastId, name, join_date: joinDate };
}

export async function getMemberEarnings(memberId: number): Promise<number> {
  const db = await getDb();
  const result = await db.select<{ total: number }[]>('SELECT SUM(total_payout) as total FROM deposit WHERE member_id = ?', [memberId]);
  return result[0]?.total || 0;
}