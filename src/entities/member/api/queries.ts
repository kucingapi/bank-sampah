import { getDb } from '@/shared/api';
import type { Member } from '../model/types';

export async function listMembers(search?: string, dateStart?: string, dateEnd?: string): Promise<(Member & { totalEarnings: number })[]> {
  const db = await getDb();
  let query = `
    SELECT 
      m.*,
      COALESCE(SUM(d.total_payout), 0) as totalEarnings
    FROM member m
    LEFT JOIN deposit d ON m.id = d.member_id
    WHERE 1=1
  `;
  const args: any[] = [];
  
  if (search) {
    query += ' AND m.name LIKE $1';
    args.push(`%${search}%`);
  }
  
  // Notice we don't parameterize the index precisely beyond $1 since postgres/sqlite plugins 
  // usually handle sequential pushing, but for raw sqlite plugin we should map $1, $2, $3...
  if (dateStart && dateEnd) {
    const idx1 = args.length + 1;
    const idx2 = args.length + 2;
    query += ` AND m.join_date BETWEEN $${idx1} AND $${idx2}`;
    args.push(dateStart, dateEnd);
  }
  
  query += ' GROUP BY m.id ORDER BY m.join_date DESC';
  
  // We type cast to match what the SQL returns. Note that the DB aliases to `totalEarnings`
  return await db.select<(Member & { totalEarnings: number })[]>(query, args);
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
