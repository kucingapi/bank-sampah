import { getDb } from '@/shared/api';
import { getPreviousSemester, getSemesterDateRange, type SemesterLabel } from '@/shared/lib/semester';

export interface MemberPaymentPivot {
  memberId: number;
  memberName: string;
  eventPayouts: Record<string, number>;
  totalPayout: number;
  rolloverSavings: number; // savings rolled over from previous semester
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
        rolloverSavings: 0,
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

// ── Semester-based queries ────────────────────────────────────────────────

export interface MemberSemesterPayment {
  memberId: number;
  memberName: string;
  eventPayouts: Record<string, number>;
  semesterPayout: number; // total for this semester only
  rolloverSavings: number; // savings from previous semester that was marked as saved
  isSaved: boolean; // whether this semester is marked as saved
}

/**
 * Get member payment data for a specific semester, including rollover savings.
 */
export async function getMemberSemesterPivot(
  semesterLabel: SemesterLabel
): Promise<MemberSemesterPayment[]> {
  const db = await getDb();

  // Parse semester label
  const { startDate, endDate } = getSemesterDateRange(semesterLabel);

  // Get events in this semester (used for debugging)
  await db.select<{ id: string; event_date: string }[]>(
    'SELECT id, event_date FROM event WHERE event_date BETWEEN $1 AND $2 ORDER BY event_date ASC',
    [startDate, endDate]
  );

  // Get member payouts per event for this semester
  const payouts = await db.select<{
    memberId: number;
    memberName: string;
    eventId: string;
    totalPayout: number;
  }[]>(
    `SELECT
      m.id as memberId,
      m.name as memberName,
      e.id as eventId,
      COALESCE(SUM(di.weight * er.active_rate), 0) as totalPayout
    FROM member m
    JOIN deposit d ON CAST(m.id AS INTEGER) = CAST(d.member_id AS INTEGER)
    JOIN event e ON d.event_id = e.id
    JOIN deposit_item di ON d.id = di.deposit_id
    JOIN event_rate er ON er.event_id = d.event_id AND er.category_id = di.category_id
    WHERE e.event_date BETWEEN $1 AND $2
    GROUP BY m.id, e.id
    ORDER BY m.join_date ASC, e.event_date ASC`,
    [startDate, endDate]
  );

  // Get previous semester label for rollover
  const prevSemester = getPreviousSemester(semesterLabel);

  // Get all members who have savings from the previous semester
  const rolloverRows = await db.select<{
    member_id: number;
    saved_amount: number;
    is_saved: number;
  }[]>(
    'SELECT member_id, saved_amount, is_saved FROM semester_savings WHERE semester_label = $1 AND is_saved = 1',
    [prevSemester]
  );

  const rolloverMap: Record<number, number> = {};
  for (const r of rolloverRows) {
    rolloverMap[r.member_id] = r.saved_amount;
  }

  // Get current semester savings status per member
  const currentSavingsRows = await db.select<{
    member_id: number;
    is_saved: number;
  }[]>(
    'SELECT member_id, is_saved FROM semester_savings WHERE semester_label = $1',
    [semesterLabel]
  );

  const savedMap: Record<number, boolean> = {};
  for (const r of currentSavingsRows) {
    savedMap[r.member_id] = r.is_saved === 1;
  }

  // Build result
  const memberMap: Record<number, MemberSemesterPayment> = {};

  for (const p of payouts) {
    if (!memberMap[p.memberId]) {
      memberMap[p.memberId] = {
        memberId: p.memberId,
        memberName: p.memberName,
        eventPayouts: {},
        semesterPayout: 0,
        rolloverSavings: rolloverMap[p.memberId] || 0,
        isSaved: savedMap[p.memberId] || false,
      };
    }
    memberMap[p.memberId].eventPayouts[p.eventId] = p.totalPayout;
    memberMap[p.memberId].semesterPayout += p.totalPayout;
  }

  // Also include members with rollover savings but no current semester activity
  for (const memberId of Object.keys(rolloverMap).map(Number)) {
    if (!memberMap[memberId]) {
      // Need member name
      const memberRows = await db.select<{ id: number; name: string }[]>(
        'SELECT id, name FROM member WHERE id = $1',
        [memberId]
      );
      if (memberRows.length > 0) {
        memberMap[memberId] = {
          memberId: memberRows[0].id,
          memberName: memberRows[0].name,
          eventPayouts: {},
          semesterPayout: 0,
          rolloverSavings: rolloverMap[memberId] || 0,
          isSaved: savedMap[memberId] || false,
        };
      }
    }
  }

  // Sort by join_date
  const members = await db.select<{ id: number }[]>(
    'SELECT id FROM member ORDER BY join_date ASC'
  );
  const memberOrder = new Map(members.map((m, i) => [m.id, i]));

  return Object.values(memberMap).sort(
    (a, b) => (memberOrder.get(a.memberId) ?? 999) - (memberOrder.get(b.memberId) ?? 999)
  );
}

/**
 * Get semester summary totals across all members.
 */
export async function getSemesterSummary(
  semesterLabel: SemesterLabel
): Promise<{
  totalSemesterPayout: number;
  totalRolloverSavings: number;
  grandTotal: number;
}> {
  const data = await getMemberSemesterPivot(semesterLabel);
  const totalSemesterPayout = data.reduce((sum, d) => sum + d.semesterPayout, 0);
  const totalRolloverSavings = data.reduce((sum, d) => sum + d.rolloverSavings, 0);
  return {
    totalSemesterPayout,
    totalRolloverSavings,
    grandTotal: totalSemesterPayout + totalRolloverSavings,
  };
}
