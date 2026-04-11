export type SemesterLabel = string;

export interface SemesterOption {
  label: string;
  value: SemesterLabel;
  year: number;
  semester: 1 | 2;
  startDate: string;
  endDate: string;
}

function getFebEnd(year: number): string {
  const date = new Date(year, 1, 29);
  return date.getMonth() === 1 ? `${year}-02-29` : `${year}-02-28`;
}

export function getSemesterOptions(currentYear?: number): SemesterOption[] {
  const year = currentYear || new Date().getFullYear();
  const years = [year - 1, year, year + 1];
  const options: SemesterOption[] = [];

  for (const y of years) {
    options.push({
      label: `${y} - Semester 1 (Mar–Agu)`,
      value: `${y}-S1`,
      year: y,
      semester: 1,
      startDate: `${y}-03-01`,
      endDate: `${y}-08-31`,
    });
    options.push({
      label: `${y} - Semester 2 (Sep–Feb '${(y + 1).toString().slice(-2)})`,
      value: `${y}-S2`,
      year: y,
      semester: 2,
      startDate: `${y}-09-01`,
      endDate: getFebEnd(y + 1),
    });
  }

  return options;
}

export function getPreviousSemester(semesterLabel: SemesterLabel): SemesterLabel {
  const [yearStr, sem] = semesterLabel.split('-');
  const year = parseInt(yearStr, 10);
  if (sem === 'S1') {
    return `${year - 1}-S2`;
  }
  return `${year}-S1`;
}

export function getNextSemester(semesterLabel: SemesterLabel): SemesterLabel {
  const [yearStr, sem] = semesterLabel.split('-');
  const year = parseInt(yearStr, 10);
  if (sem === 'S2') {
    return `${year + 1}-S1`;
  }
  return `${year}-S2`;
}

export function getSemesterDateRange(
  semesterLabel: SemesterLabel
): { startDate: string; endDate: string } {
  const [yearStr, sem] = semesterLabel.split('-');
  const year = parseInt(yearStr, 10);
  if (sem === 'S1') {
    return { startDate: `${year}-03-01`, endDate: `${year}-08-31` };
  }
  return { startDate: `${year}-09-01`, endDate: getFebEnd(year + 1) };
}

export function getDefaultSemester(): SemesterLabel {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month <= 2) {
    return `${year - 1}-S2`;
  }
  if (month <= 8) {
    return `${year}-S1`;
  }
  return `${year}-S2`;
}

export function formatSemesterLabel(semesterLabel: SemesterLabel): string {
  const [yearStr, sem] = semesterLabel.split('-');
  const year = parseInt(yearStr, 10);
  if (sem === 'S1') {
    return `${year} - Semester 1 (Mar–Agu)`;
  }
  return `${year} - Semester 2 (Sep–Feb '${(year + 1).toString().slice(-2)})`;
}
