export interface Deposit {
  id: string;
  event_id: string;
  member_id: number;
  vendor_id: number | null;
  time: string;
  total_payout: number;
}

export interface DepositItem {
  deposit_id: string;
  category_id: string;
  vendor_id: number;
  weight: number;
}