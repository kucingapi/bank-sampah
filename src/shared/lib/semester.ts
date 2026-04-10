export type SemesterLabel = string; // e.g. "2026-S1", "2026-S2"

export interface SemesterOption {
  label: string; // display text, e.g. "2026 - Semester 1 (Jan–Jun)"
  value: SemesterLabel; // e.g. "2026-S1"
  year: number;
  semester: 1 | 2;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Build a list of semester options around the current year.
 * Generates: (currentYear-1)-S1, (currentYear-1)-S2, currentYear-S1, currentYear-S2, (currentYear+1)-S1, (currentYear+1)-S2
 */
export function getSemesterOptions(currentYear?: number): SemesterOption[] {
  const year = currentYear || new Date().getFullYear();
  const years = [year - 1, year, year + 1];
  const options: SemesterOption[] = [];

  for (const y of years) {
    options.push({
      label: `${y} - Semester 1 (Jan–Jun)`,
      value: `${y}-S1`,
      year: y,
      semester: 1,
      startDate: `${y}-01-01`,
      endDate: `${y}-06-30`,
    });
    options.push({
      label: `${y} - Semester 2 (Jul–Des)`,
      value: `${y}-S2`,
      year: y,
      semester: 2,
      startDate: `${y}-07-01`,
      endDate: `${y}-12-31`,
    });
  }

  return options;
}

/**
 * Get the previous semester label. S1 rolls back to S2 of previous year.
 */
export function getPreviousSemester(semesterLabel: SemesterLabel): SemesterLabel {
  const [yearStr, sem] = semesterLabel.split('-');
  const year = parseInt(yearStr, 10);
  if (sem === 'S1') {
    return `${year - 1}-S2`;
  }
  return `${year}-S1`;
}

/**
 * Get the next semester label. S2 rolls forward to S1 of next year.
 */
export function getNextSemester(semesterLabel: SemesterLabel): SemesterLabel {
  const [yearStr, sem] = semesterLabel.split('-');
  const year = parseInt(yearStr, 10);
  if (sem === 'S2') {
    return `${year + 1}-S1`;
  }
  return `${year}-S2`;
}

/**
 * Get date range for a semester label.
 */
export function getSemesterDateRange(
  semesterLabel: SemesterLabel
): { startDate: string; endDate: string } {
  const [yearStr, sem] = semesterLabel.split('-');
  const year = parseInt(yearStr, 10);
  if (sem === 'S1') {
    return { startDate: `${year}-01-01`, endDate: `${year}-06-30` };
  }
  return { startDate: `${year}-07-01`, endDate: `${year}-12-31` };
}

/**
 * Get default semester (current year, current semester based on month).
 */
export function getDefaultSemester(): SemesterLabel {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const sem = month <= 6 ? 'S1' : 'S2';
  return `${year}-${sem}`;
}

/**
 * Get a human-readable label from a semester value.
 */
export function formatSemesterLabel(semesterLabel: SemesterLabel): string {
  const [yearStr, sem] = semesterLabel.split('-');
  const year = parseInt(yearStr, 10);
  if (sem === 'S1') {
    return `${year} - Semester 1 (Jan–Jun)`;
  }
  return `${year} - Semester 2 (Jul–Des)`;
}
