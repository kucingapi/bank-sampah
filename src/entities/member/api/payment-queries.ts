import { getDb } from '@/shared/api';

export interface MemberPaymentPivot {
  memberId: number;
  memberName: string;
  eventPayouts: Record<string, number>;
  totalPayout: number;
}

export interface MemberPaymentDetail {
  memberId: number;
  memberName: string;
  eventId: string;
  eventDate: string;
  depositId: string;
  items: {
    categoryName: string;
    weight: number;
    rate: number;
    payout: number;
  }[];
  totalPayout: number;
}

export async function getMemberPaymentPivot(
  eventDateStart?: string,
  eventDateEnd?: string
): Promise<MemberPaymentPivot[]> {
  const db = await getDb();

  // Get member payouts per event
  let payoutQuery = `
    SELECT
      m.id as memberId,
      m.name as memberName,
      e.id as eventId,
      COALESCE(SUM(di.weight * er.active_rate), 0) as totalPayout
    FROM member m
    JOIN deposit d ON m.id = d.member_id
    JOIN event e ON d.event_id = e.id
    JOIN deposit_item di ON d.id = di.deposit_id
    JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
  `;

  const payoutArgs: any[] = [];

  if (eventDateStart && eventDateEnd) {
    payoutQuery += ` WHERE e.event_date BETWEEN $1 AND $2`;
    payoutArgs.push(eventDateStart, eventDateEnd);
  }

  payoutQuery += ` GROUP BY m.id, e.id ORDER BY m.join_date ASC, e.event_date ASC`;

  const payouts = await db.select<{
    memberId: number;
    memberName: string;
    eventId: string;
    totalPayout: number;
  }[]>(payoutQuery, payoutArgs);

  // Build pivot table
  const memberMap: Record<number, MemberPaymentPivot> = {};

  for (const p of payouts) {
    if (!memberMap[p.memberId]) {
      memberMap[p.memberId] = {
        memberId: p.memberId,
        memberName: p.memberName,
        eventPayouts: {},
        totalPayout: 0,
      };
    }
    memberMap[p.memberId].eventPayouts[p.eventId] = p.totalPayout;
    memberMap[p.memberId].totalPayout += p.totalPayout;
  }

  return Object.values(memberMap);
}

export async function getMemberPaymentDetails(
  memberId: number,
  eventDateStart?: string,
  eventDateEnd?: string
): Promise<MemberPaymentDetail[]> {
  const db = await getDb();

  let query = `
    SELECT
      m.id as memberId,
      m.name as memberName,
      e.id as eventId,
      e.event_date as eventDate,
      d.id as depositId,
      c.name as categoryName,
      di.weight as weight,
      er.active_rate as rate,
      (di.weight * er.active_rate) as payout
    FROM deposit d
    JOIN member m ON d.member_id = m.id
    JOIN event e ON d.event_id = e.id
    JOIN deposit_item di ON d.id = di.deposit_id
    JOIN category c ON di.category_id = c.id
    JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
    WHERE m.id = $1
  `;

  const args: any[] = [memberId];

  if (eventDateStart && eventDateEnd) {
    const idx1 = args.length + 1;
    const idx2 = args.length + 2;
    query += ` AND e.event_date BETWEEN $${idx1} AND $${idx2}`;
    args.push(eventDateStart, eventDateEnd);
  }

  query += ` ORDER BY e.event_date DESC, d.time ASC, c.name ASC`;

  const rows = await db.select<{
    memberId: number;
    memberName: string;
    eventId: string;
    eventDate: string;
    depositId: string;
    categoryName: string;
    weight: number;
    rate: number;
    payout: number;
  }[]>(query, args);

  // Group by deposit
  const grouped: Record<string, MemberPaymentDetail> = {};

  for (const row of rows) {
    const key = row.depositId;
    if (!grouped[key]) {
      grouped[key] = {
        memberId: row.memberId,
        memberName: row.memberName,
        eventId: row.eventId,
        eventDate: row.eventDate,
        depositId: row.depositId,
        items: [],
        totalPayout: 0,
      };
    }
    grouped[key].items.push({
      categoryName: row.categoryName,
      weight: row.weight,
      rate: row.rate,
      payout: row.payout,
    });
    grouped[key].totalPayout += row.payout;
  }

  return Object.values(grouped);
}

export async function getEventsInRange(
  eventDateStart?: string,
  eventDateEnd?: string
): Promise<{ id: string; event_date: string }[]> {
  const db = await getDb();

  let query = `SELECT id, event_date FROM event`;
  const args: any[] = [];

  if (eventDateStart && eventDateEnd) {
    query += ` WHERE event_date BETWEEN $1 AND $2`;
    args.push(eventDateStart, eventDateEnd);
  }

  query += ` ORDER BY event_date ASC`;

  return await db.select<{ id: string; event_date: string }[]>(query, args);
}

export async function exportMemberPaymentPivot(
  events: { id: string; event_date: string }[],
  pivotData: MemberPaymentPivot[]
): Promise<string> {
  const headers = ['No', 'Nama', ...events.map(e => new Date(e.event_date).toLocaleDateString('id-ID')), 'Jumlah'];
  const csvRows = [headers.join(',')];

  pivotData.forEach((row, idx) => {
    const values = [
      idx + 1,
      `"${row.memberName}"`,
      ...events.map(e => row.eventPayouts[e.id]?.toFixed(0) || '0'),
      row.totalPayout.toFixed(0),
    ];
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}
