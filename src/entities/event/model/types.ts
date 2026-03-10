export interface Event {
  id: string;
  event_date: string;
  status: string;
}

export interface EventRate {
  event_id: string;
  category_id: string;
  active_rate: number;
  is_active: number;
}

export interface EventCategoryTotal {
  categoryId: string;
  totalWeight: number;
  totalPayout: number;
}
