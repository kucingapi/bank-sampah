import { getDb } from '@/shared/api';
import { generateId } from '@/shared/lib/id';
import type { VendorManifest, ManifestItem } from '../model/types';
import type { Vendor } from '@/entities/vendor/model/types';

export interface ManifestWithDetails extends VendorManifest {
  vendor?: Vendor;
  items: ManifestItem[];
}

async function ensureWeightColumn() {
  const db = await getDb();
  try {
    await db.execute('ALTER TABLE manifest_item ADD COLUMN weight REAL NOT NULL DEFAULT 0');
  } catch {
    // Column already exists
  }
}

export async function listManifests(eventId: string): Promise<ManifestWithDetails[]> {
  const db = await getDb();
  
  const manifests = await db.select<VendorManifest[]>(
    'SELECT * FROM vendor_manifest WHERE event_id = ?',
    [eventId]
  );
  
  if (manifests.length === 0) return [];
  
  const vendors = await db.select<Vendor[]>(
    'SELECT * FROM vendor WHERE id IN (' + manifests.map(m => `'${m.vendor_id}'`).join(',') + ')'
  );
  
  await ensureWeightColumn();
  
  const items = await db.select<ManifestItem[]>(
    'SELECT * FROM manifest_item WHERE manifest_id IN (' + manifests.map(m => `'${m.id}'`).join(',') + ')'
  );
  
  return manifests.map(m => ({
    ...m,
    vendor: vendors.find(v => v.id === m.vendor_id),
    items: items.filter(i => i.manifest_id === m.id)
  }));
}

export async function createManifest(
  eventId: string, 
  vendorId: number, 
  items: { category_id: string, outbound_rate: number, weight: number }[]
): Promise<string> {
  const db = await getDb();
  await ensureWeightColumn();
  const id = generateId();
  
  await db.execute(
    'INSERT INTO vendor_manifest (id, event_id, vendor_id) VALUES (?, ?, ?)',
    [id, eventId, vendorId]
  );
  
  for (const item of items) {
    await db.execute(
      'INSERT INTO manifest_item (manifest_id, category_id, outbound_rate, weight) VALUES (?, ?, ?, ?)',
      [id, item.category_id, item.outbound_rate, item.weight]
    );
  }
  
  return id;
}

export async function createManifestsByAssignments(
  eventId: string,
  assignments: { vendorId: number; items: { category_id: string; outbound_rate: number; weight: number }[] }[]
): Promise<void> {
  const db = await getDb();
  await ensureWeightColumn();
  
  for (const assignment of assignments) {
    const id = generateId();
    await db.execute(
      'INSERT INTO vendor_manifest (id, event_id, vendor_id) VALUES (?, ?, ?)',
      [id, eventId, assignment.vendorId]
    );
    
    for (const item of assignment.items) {
      await db.execute(
        'INSERT INTO manifest_item (manifest_id, category_id, outbound_rate, weight) VALUES (?, ?, ?, ?)',
        [id, item.category_id, item.outbound_rate, item.weight]
      );
    }
  }
}

export async function deleteManifestsByEvent(eventId: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM manifest_item WHERE manifest_id IN (SELECT id FROM vendor_manifest WHERE event_id = ?)', [eventId]);
  await db.execute('DELETE FROM vendor_manifest WHERE event_id = ?', [eventId]);
}

export async function getEventManifests(eventId: string): Promise<ManifestWithDetails[]> {
  return listManifests(eventId);
}

export async function hasManifest(eventId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM vendor_manifest WHERE event_id = ?',
    [eventId]
  );
  return result[0]?.count > 0;
}
