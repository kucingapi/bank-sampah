export interface Deposit {
  id: string;
  event_id: string;
  member_id: string;
  time: string;
  total_payout: number;
}

export interface DepositItem {
  deposit_id: string;
  category_id: string;
  weight: number;
}
