import Database from '@tauri-apps/plugin-sql';

// ── Types ──────────────────────────────────────────────

export interface Member {
  id: string;
  name: string;
  join_date: string;
}

export interface Category {
  id: string;
  name: string;
  unit: string;
  default_rate: number;
  status: string;
}

export interface Vendor {
  id: string;
  name: string;
}

export interface Event {
  id: string;
  event_date: string;
  status: string;
}

export interface EventRate {
  event_id: string;
  category_id: string;
  active_rate: number;
  outbound_rate: number;
}

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

export interface VendorManifest {
  id: string;
  event_id: string;
  vendor_id: string;
}

export interface ManifestItem {
  manifest_id: string;
  category_id: string;
  outbound_rate: number;
}

// ── Database singleton ─────────────────────────────────

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:bank_sampah.db');
  }
  return db;
}
