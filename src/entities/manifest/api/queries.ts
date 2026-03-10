import { getDb } from '@/shared/api';
import { generateId } from '@/shared/lib/id';
import type { VendorManifest, ManifestItem } from '../model/types';
import type { Vendor } from '@/entities/vendor/model/types';

export interface ManifestWithDetails extends VendorManifest {
  vendor?: Vendor;
  items: ManifestItem[];
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
  items: { category_id: string, outbound_rate: number }[]
): Promise<string> {
  const db = await getDb();
  const id = generateId();
  
  await db.execute(
    'INSERT INTO vendor_manifest (id, event_id, vendor_id) VALUES (?, ?, ?)',
    [id, eventId, vendorId]
  );
  
  for (const item of items) {
    await db.execute(
      'INSERT INTO manifest_item (manifest_id, category_id, outbound_rate) VALUES (?, ?, ?)',
      [id, item.category_id, item.outbound_rate]
    );
  }
  
  return id;
}

export async function createManifestsByAssignments(
  eventId: string,
  assignments: { vendorId: number; items: { category_id: string; outbound_rate: number }[] }[]
): Promise<void> {
  const db = await getDb();
  
  for (const assignment of assignments) {
    const id = generateId();
    await db.execute(
      'INSERT INTO vendor_manifest (id, event_id, vendor_id) VALUES (?, ?, ?)',
      [id, eventId, assignment.vendorId]
    );
    
    for (const item of assignment.items) {
      await db.execute(
        'INSERT INTO manifest_item (manifest_id, category_id, outbound_rate) VALUES (?, ?, ?)',
        [id, item.category_id, item.outbound_rate]
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
