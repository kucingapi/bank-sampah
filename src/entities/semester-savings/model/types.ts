export interface SemesterSavings {
  id: string;
  memberId: number;
  semesterLabel: string;
  savedAmount: number;
  isSaved: boolean;
  rolledFrom: string | null;
}
