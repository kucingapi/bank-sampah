export interface VendorManifest {
  id: string;
  event_id: string;
  vendor_id: number;
}

export interface ManifestItem {
  manifest_id: string;
  category_id: string;
  outbound_rate: number;
}
