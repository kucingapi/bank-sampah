export interface Category {
  id: string;
  name: string;
  unit: string;
  default_rate: number;
  buy_rate: number;
  status: string;
  archived: boolean;
  sort_order: number;
  default_vendor_id: number | null;
}
