import { getDb } from '@/shared/api';

export interface DashboardStats {
  totalWeight: number;
  totalPayout: number;
  activeMembers: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  totalWeight: number;
  percentage: number;
}

export async function getDashboardStats(dateStart?: string, dateEnd?: string): Promise<DashboardStats> {
  const db = await getDb();
  let queryExt = '';
  const args: any[] = [];
  
  if (dateStart && dateEnd) {
    queryExt = ' AND time BETWEEN ? AND ?';
    args.push(dateStart, dateEnd);
  }

  // Active members
  const memberRes = await db.select<{ count: number }[]>(
    `SELECT COUNT(DISTINCT member_id) as count FROM deposit WHERE 1=1 ${queryExt}`, 
    args
  );
  
  // Total payout
  const payoutRes = await db.select<{ total: number }[]>(
    `SELECT SUM(total_payout) as total FROM deposit WHERE 1=1 ${queryExt}`,
    args
  );

  // Total weight
  const weightRes = await db.select<{ total: number }[]>(
    `SELECT SUM(weight) as total FROM deposit_item di JOIN deposit d ON di.deposit_id = d.id WHERE 1=1 ${queryExt}`,
    args
  );

  return {
    activeMembers: memberRes[0]?.count || 0,
    totalPayout: payoutRes[0]?.total || 0,
    totalWeight: weightRes[0]?.total || 0
  };
}

export async function getCategoryBreakdown(dateStart?: string, dateEnd?: string): Promise<CategoryBreakdown[]> {
  const db = await getDb();
  let queryExt = '';
  const args: any[] = [];
  
  if (dateStart && dateEnd) {
    queryExt = ' AND d.time BETWEEN ? AND ?';
    args.push(dateStart, dateEnd);
  }

  const query = `
    SELECT 
      c.id as categoryId, 
      c.name, 
      SUM(di.weight) as totalWeight
    FROM deposit_item di
    JOIN category c ON di.category_id = c.id
    JOIN deposit d ON di.deposit_id = d.id
    WHERE 1=1 ${queryExt}
    GROUP BY c.id, c.name
    ORDER BY totalWeight DESC
  `;

  const breakdown = await db.select<{ categoryId: string, name: string, totalWeight: number }[]>(query, args);
  
  const totalWeight = breakdown.reduce((sum, item) => sum + item.totalWeight, 0);
  
  return breakdown.map(item => ({
    ...item,
    percentage: totalWeight > 0 ? (item.totalWeight / totalWeight) * 100 : 0
  }));
}
