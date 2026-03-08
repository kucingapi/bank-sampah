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
