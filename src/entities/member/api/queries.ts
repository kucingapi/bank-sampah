import { getDb } from '@/shared/api';
import type { Member } from '../model/types';

/** Ensure address and phone columns exist (handles old databases pre-migration v3) */
async function ensureMemberColumns() {
  const db = await getDb();
  try {
    await db.execute('ALTER TABLE member ADD COLUMN address TEXT');
  } catch { /* already exists */ }
  try {
    await db.execute('ALTER TABLE member ADD COLUMN phone TEXT');
  } catch { /* already exists */ }
}

export async function listMembers(
  search?: string,
  eventDateStart?: string,
  eventDateEnd?: string
): Promise<(Member & { totalEarnings: number })[]> {
  await ensureMemberColumns();
  const db = await getDb();
  let query = `
    SELECT
      m.*,
      COALESCE((
        SELECT SUM(di.weight * er.active_rate)
        FROM deposit_item di
        JOIN deposit d2 ON di.deposit_id = d2.id
        JOIN event_rate er ON er.event_id = d2.event_id AND er.category_id = di.category_id
        WHERE d2.member_id = m.id
      ), 0) as totalEarnings
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
    query += ' GROUP BY m.id HAVING totalEarnings > 0 ORDER BY m.join_date DESC';
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

export async function createMember(name: string, address?: string, phone?: string): Promise<Member> {
  await ensureMemberColumns();
  const db = await getDb();
  const joinDate = new Date().toISOString();

  const result = await db.execute(
    'INSERT INTO member (name, address, phone, join_date) VALUES (?, ?, ?, ?)',
    [name, address || null, phone || null, joinDate]
  );

  const lastId = result.lastInsertId;
  if (lastId === undefined) {
    throw new Error('Failed to create member');
  }

  return { id: lastId, name, address, phone, join_date: joinDate };
}

export async function updateMember(id: number, updates: Partial<{ name: string; address: string; phone: string }>): Promise<void> {
  await ensureMemberColumns();
  const db = await getDb();
  const setClauses: string[] = [];
  const args: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id') {
      const idx = args.length + 1;
      setClauses.push(`${key} = $${idx}`);
      args.push(value);
    }
  });

  if (setClauses.length === 0) return;

  args.push(id);
  const idIdx = args.length;
  await db.execute(`UPDATE member SET ${setClauses.join(', ')} WHERE id = $${idIdx}`, args);
}

export async function deleteMember(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM deposit_item WHERE deposit_id IN (SELECT id FROM deposit WHERE member_id = $1)', [id]);
  await db.execute('DELETE FROM deposit WHERE member_id = $1', [id]);
  await db.execute('DELETE FROM semester_savings WHERE member_id = $1', [id]);
  await db.execute('DELETE FROM member WHERE id = $1', [id]);
}

export async function getMemberEarnings(memberId: number): Promise<number> {
  const db = await getDb();
  const result = await db.select<{ total: number }[]>(
    `SELECT COALESCE(SUM(di.weight * er.active_rate), 0) as total 
     FROM deposit_item di
     JOIN deposit d ON di.deposit_id = d.id
     JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
     WHERE d.member_id = $1`,
    [memberId]
  );
  return result[0]?.total || 0;
}