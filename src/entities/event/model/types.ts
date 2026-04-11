export interface Event {
  id: string;
  event_date: string;
  status: string;
  notes?: string;
}

export interface EventRate {
  event_id: string;
  category_id: string;
  active_rate: number;     // buy rate (what we pay users)
  outbound_rate: number;   // sell rate (what we charge vendors)
  is_active: number;
}

export interface EventCategoryTotal {
  categoryId: string;
  totalWeight: number;
  totalPayout: number;       // buy total (what we paid users)
  totalSellPayout: number;   // sell total (what we charge vendors)
}
