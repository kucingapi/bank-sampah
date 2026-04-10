import { getDb } from '@/shared/api';
import type { SemesterSavings } from '../model/types';

/**
 * Get all savings records for a specific member.
 */
export async function getMemberSemesterSavings(memberId: number): Promise<SemesterSavings[]> {
  const db = await getDb();
  const rows = await db.select<{
    id: string;
    member_id: number;
    semester_label: string;
    saved_amount: number;
    is_saved: number;
    rolled_from: string | null;
  }[]>(
    'SELECT * FROM semester_savings WHERE member_id = $1 ORDER BY semester_label ASC',
    [memberId]
  );
  return rows.map((r) => ({
    id: r.id,
    memberId: r.member_id,
    semesterLabel: r.semester_label,
    savedAmount: r.saved_amount,
    isSaved: r.is_saved === 1,
    rolledFrom: r.rolled_from,
  }));
}

/**
 * Get savings for a specific member + semester.
 */
export async function getSemesterSavings(
  memberId: number,
  semesterLabel: string
): Promise<SemesterSavings | null> {
  const db = await getDb();
  const rows = await db.select<{
    id: string;
    member_id: number;
    semester_label: string;
    saved_amount: number;
    is_saved: number;
    rolled_from: string | null;
  }[]>(
    'SELECT * FROM semester_savings WHERE member_id = $1 AND semester_label = $2',
    [memberId, semesterLabel]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    memberId: r.member_id,
    semesterLabel: r.semester_label,
    savedAmount: r.saved_amount,
    isSaved: r.is_saved === 1,
    rolledFrom: r.rolled_from,
  };
}

/**
 * Upsert savings for a member + semester.
 */
export async function upsertSemesterSavings(
  memberId: number,
  semesterLabel: string,
  savedAmount: number,
  isSaved: boolean,
  rolledFrom: string | null
): Promise<SemesterSavings> {
  const db = await getDb();
  const id = `ss-${memberId}-${semesterLabel}`;
  await db.execute(
    `INSERT INTO semester_savings (id, member_id, semester_label, saved_amount, is_saved, rolled_from)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(id) DO UPDATE SET saved_amount = $4, is_saved = $5, rolled_from = $6`,
    [id, memberId, semesterLabel, savedAmount, isSaved ? 1 : 0, rolledFrom]
  );
  return {
    id,
    memberId,
    semesterLabel,
    savedAmount,
    isSaved,
    rolledFrom,
  };
}

/**
 * Get the rolled-over savings amount from a previous semester for a member.
 * If the previous semester was saved, return its saved_amount.
 */
export async function getRolloverAmount(
  memberId: number,
  previousSemesterLabel: string
): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ saved_amount: number; is_saved: number }[]>(
    'SELECT saved_amount, is_saved FROM semester_savings WHERE member_id = $1 AND semester_label = $2',
    [memberId, previousSemesterLabel]
  );
  if (rows.length === 0 || rows[0].is_saved !== 1) return 0;
  return rows[0].saved_amount;
}

/**
 * Delete a semester savings record.
 */
export async function deleteSemesterSavings(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM semester_savings WHERE id = $1', [id]);
}
