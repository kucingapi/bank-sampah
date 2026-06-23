import { getDb } from '@/shared/api';

export interface DashboardStats {
  totalWeight: number;
  totalKg: number;
  totalPc: number;
  totalPayout: number;
  activeMembers: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  unit: string;
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

  // Total weight by unit
  const kgRes = await db.select<{ total: number }[]>(
    `SELECT ROUND(SUM(di.weight), 2) as total FROM deposit_item di
     JOIN category c ON di.category_id = c.id
     JOIN deposit d ON di.deposit_id = d.id
     WHERE c.unit = 'kg'${queryExt.replace(' AND', ' AND d.')}`,
    args
  );

  const pcRes = await db.select<{ total: number }[]>(
    `SELECT ROUND(SUM(di.weight), 2) as total FROM deposit_item di
     JOIN category c ON di.category_id = c.id
     JOIN deposit d ON di.deposit_id = d.id
     WHERE c.unit = 'pc'${queryExt.replace(' AND', ' AND d.')}`,
    args
  );

  return {
    activeMembers: memberRes[0]?.count || 0,
    totalPayout: payoutRes[0]?.total || 0,
    totalWeight: (kgRes[0]?.total || 0) + (pcRes[0]?.total || 0),
    totalKg: kgRes[0]?.total || 0,
    totalPc: pcRes[0]?.total || 0
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
      c.unit,
      ROUND(SUM(di.weight), 2) as totalWeight
    FROM deposit_item di
    JOIN category c ON di.category_id = c.id
    JOIN deposit d ON di.deposit_id = d.id
    WHERE 1=1 ${queryExt}
    GROUP BY c.id, c.name, c.unit
    ORDER BY totalWeight DESC
  `;

const breakdown = await db.select<{ categoryId: string, name: string, unit: string, totalWeight: number }[]>(query, args);
  
  const unitTotals = breakdown.reduce<Record<string, number>>((acc, item) => {
    acc[item.unit] = (acc[item.unit] || 0) + item.totalWeight;
    return acc;
  }, {});

  return breakdown.map(item => ({
    ...item,
    percentage: (unitTotals[item.unit] || 0) > 0 ? (item.totalWeight / unitTotals[item.unit]) * 100 : 0
  }));
}
