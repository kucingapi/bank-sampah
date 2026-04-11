import { useState, useMemo, useEffect, Fragment } from 'react';
import { ArrowLeft, Printer, Truck, FileText, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useEvent, useEventCategoryTotals, useEventRates } from '@/entities/event/api/hooks';
import { updateEventNotes } from '@/entities/event/api/queries';
import { useVendors, useCreateVendor } from '@/entities/vendor/api/hooks';
import { useCreateManifestsByAssignments, useManifests } from '@/entities/manifest/api/hooks';
import { getOrCreateDefaultVendors } from '@/entities/vendor/api/queries';
import type { EventCategoryTotal } from '@/entities/event/model/types';
import type { Vendor } from '@/entities/vendor/model/types';
import { formatCurrency } from '@/shared/lib/format';
import { getDb } from '@/shared/api';
import { Button } from '@/shared/ui/ui/button';
import { Skeleton } from '@/shared/ui/ui/skeleton';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from '@/shared/ui/ui/table';
import { ExportCSVButton } from '@/shared/ui/ExportCSVButton';
import { exportToCSV } from '@/shared/lib/csv';

interface Props {
  eventId: string;
}

interface CategoryItem extends EventCategoryTotal {
  name: string;
  unit: string;
  outboundRate: number;
}

interface VendorGroup {
  vendorId: number;
  vendorName: string;
  categories: CategoryItem[];
  totalWeight: number;
  totalPayout: number;
  totalSellPayout: number;
  totalProfit: number;
}

function VendorReportPageSkeleton() {
  return (
    <div className="p-12 mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div className="flex items-center gap-6">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </header>

      <div className="border border-input rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
              <TableHead className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableHead>
              <TableHead className="text-right"><Skeleton className="h-4 w-28 ml-auto" /></TableHead>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-10 w-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function VendorReportPage({ eventId }: Props) {
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
  const [vendorMappings, setVendorMappings] = useState<Record<string, number>>({});
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [expandedVendors, setExpandedVendors] = useState<Set<number>>(new Set());
  const [defaultVendorIds, setDefaultVendorIds] = useState<{ bsm: number; lainnya: number } | null>(null);
  const [newVendorName, setNewVendorName] = useState('');
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: categoryTotals, isLoading: totalsLoading } = useEventCategoryTotals(eventId);
  const { data: eventRates } = useEventRates(eventId);
  const { data: existingManifests } = useManifests(eventId);
  const { data: vendorsData = [] } = useVendors();

  useEffect(() => {
    if (event) {
      setNotes((event as any).notes || '');
    }
  }, [event]);
  
  const createVendor = useCreateVendor();
  const createManifests = useCreateManifestsByAssignments();

  // 1. Initialize Default Vendors and Available Vendors
  useEffect(() => {
    async function loadDefaults() {
      const defaults = await getOrCreateDefaultVendors();
      setDefaultVendorIds({ bsm: defaults.bsm.id, lainnya: defaults.lainnya.id });
    }
    loadDefaults();
  }, []);

  useEffect(() => {
    if (defaultVendorIds) {
      setAvailableVendors([...vendorsData]);
    }
  }, [vendorsData, defaultVendorIds]);

  // 2. Initialize Category Items and Mappings
  useEffect(() => {
    async function initializeMappings() {
      if (!categoryTotals || !defaultVendorIds) return;

      const db = await getDb();
      const cats = await db.select<{ id: string, name: string, unit: string }[]>('SELECT id, name, unit FROM category');

      // Build outbound rate map from event_rates
      const outboundRateMap: Record<string, number> = {};
      if (eventRates) {
        eventRates.forEach(er => {
          outboundRateMap[er.category_id] = er.outbound_rate;
        });
      }

      const items: CategoryItem[] = categoryTotals.map(ct => {
        const cat = cats.find(c => c.id === ct.categoryId);
        return {
          ...ct,
          name: cat?.name || 'Unknown',
          unit: cat?.unit || 'kg',
          outboundRate: outboundRateMap[ct.categoryId] || 0
        };
      });
      setCategoryItems(items);

      const mapping: Record<string, number> = {};

      if (existingManifests && existingManifests.length > 0) {
        existingManifests.forEach(m => {
          m.items.forEach(item => {
            mapping[item.category_id] = m.vendor_id;
          });
        });
      } else {
        items.forEach(item => {
          if (item.name.toLowerCase().includes('c4') || item.name.toLowerCase().includes('karton') || item.name.toLowerCase().includes('kertas')) {
            mapping[item.categoryId] = defaultVendorIds.bsm;
          } else {
            mapping[item.categoryId] = defaultVendorIds.lainnya;
          }
        });
      }

      setVendorMappings(mapping);
    }
    initializeMappings();
  }, [categoryTotals, existingManifests, defaultVendorIds, eventRates]);

  const handleVendorChange = (categoryId: string, vendorId: number) => {
    setVendorMappings(prev => ({
      ...prev,
      [categoryId]: vendorId
    }));
  };

  const handleQuickAddVendor = async () => {
    if (!newVendorName.trim()) return;
    setIsAddingVendor(true);
    try {
      await createVendor.mutateAsync(newVendorName.trim());
      setNewVendorName('');
      // Optionally auto-assign selected categories to new vendor here if needed
    } catch (err) {
      console.error(err);
      alert('Gagal menambah vendor.');
    } finally {
      setIsAddingVendor(false);
    }
  };

  const handleNotesBlur = async () => {
    if (event) {
      await updateEventNotes(eventId, notes);
    }
  };

  const vendorGroups = useMemo((): VendorGroup[] => {
    const groups: Record<number, VendorGroup> = {};
    
    categoryItems.forEach(item => {
      const vendorId = vendorMappings[item.categoryId] || defaultVendorIds?.lainnya || 0;
      const vendor = availableVendors.find(v => v.id === vendorId) || 
                     (vendorId === defaultVendorIds?.bsm ? { id: vendorId, name: 'BSM' } : 
                      vendorId === defaultVendorIds?.lainnya ? { id: vendorId, name: 'Lainnya' } : null);
      
      const vendorName = vendor?.name || 'Unknown Vendor';
      
      if (!groups[vendorId]) {
        groups[vendorId] = {
          vendorId,
          vendorName,
          categories: [],
          totalWeight: 0,
          totalPayout: 0,
          totalSellPayout: 0,
          totalProfit: 0
        };
      }

      groups[vendorId].categories.push(item);
      groups[vendorId].totalWeight += item.totalWeight;
      groups[vendorId].totalPayout += item.totalPayout;
      groups[vendorId].totalSellPayout += item.totalSellPayout;
      groups[vendorId].totalProfit += item.totalSellPayout - item.totalPayout;
    });
    
    return Object.values(groups).sort((a, b) => b.totalWeight - a.totalWeight);
  }, [categoryItems, vendorMappings, availableVendors, defaultVendorIds]);

  const isFullyAssigned = useMemo(() => {
    return categoryItems.length > 0 && categoryItems.every(item => vendorMappings[item.categoryId] !== undefined);
  }, [categoryItems, vendorMappings]);

  const grandTotalBuyPayout = categoryItems.reduce((sum, item) => sum + item.totalPayout, 0);
  const grandTotalSellPayout = categoryItems.reduce((sum, item) => sum + item.totalSellPayout, 0);
  
  const summaryText = useMemo(() => {
    const kgTotal = categoryItems.filter(i => i.unit === 'kg').reduce((sum, i) => sum + i.totalWeight, 0);
    const pcItems = categoryItems.filter(i => i.unit === 'pc');
    
    const parts: string[] = [];
    if (kgTotal > 0 || pcItems.length === 0) {
      parts.push(`${kgTotal.toFixed(2)} KG`);
    }
    pcItems.forEach(i => {
      parts.push(`${i.totalWeight} PC ${i.name}`);
    });
    
    return parts.join(', ');
  }, [categoryItems]);

  const handleSubmit = async () => {
    if (!isFullyAssigned || categoryItems.length === 0 || !defaultVendorIds) return;

    try {
      const assignments = vendorGroups.map(group => ({
        vendorId: group.vendorId,
        items: group.categories.map(c => ({ category_id: c.categoryId, outbound_rate: c.outboundRate }))
      }));

      await createManifests.mutateAsync({
        eventId,
        assignments
      });
      alert('Manifest Laporan Vendor berhasil dibuat!');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat manifest.');
    }
  };

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'event-details', eventId } }));
  };

  const handleExport = () => {
    const exportData = categoryItems.map(t => ({
      category: t.name,
      total_weight: t.totalWeight,
      unit: t.unit,
      total_buy_payout: t.totalPayout,
      total_sell_payout: t.totalSellPayout,
      vendor: availableVendors.find(v => v.id === vendorMappings[t.categoryId])?.name || 'Unknown'
    }));
    exportToCSV(exportData, 'manifest-report');
  };

  const toggleVendorExpand = (vendorId: number) => {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
      }
      return next;
    });
  };

  if (eventLoading || totalsLoading || !event || !defaultVendorIds) {
    return <VendorReportPageSkeleton />;
  }

  return (
    <div className="p-12 mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-border pb-6 print:border-none">
        <div className="flex items-center gap-6">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground print:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Laporan <span className="text-muted-foreground/60">Penyetoran</span>
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">Distribusi penjualan material sesi {new Date(event.event_date).toLocaleDateString('id-ID')}.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 print:hidden">
           <ExportCSVButton onExport={handleExport} filename="manifest" />
           <Button onClick={() => window.print()} variant="outline" data-icon="inline-start">
             <Printer /> Cetak PDF
           </Button>
           <Button 
             onClick={handleSubmit} 
             disabled={!isFullyAssigned || createManifests.isPending || categoryItems.length === 0}
             data-icon="inline-start"
           >
             {createManifests.isPending ? <Truck className="animate-bounce" /> : <CheckCircle />}
             {createManifests.isPending ? 'Memproses...' : 'Proses Manifest'}
           </Button>
         </div>
      </header>

      {existingManifests && existingManifests.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex gap-3 print:hidden">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p>Manifest sudah dibuat untuk sesi ini. Anda dapat mengubah alokasi vendor dan memproses ulang jika diperlukan.</p>
        </div>
      )}

      <div className="border border-border rounded-lg p-4">
        <label className="micro-label text-muted-foreground mb-2 block">
          Catatan / Pengingat
        </label>
        <textarea
          className="w-full min-h-[80px] bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
          placeholder="Tambahkan catatan atau pengingat untuk laporan ini..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
        />
      </div>

      <div className="flex items-center gap-4 print:hidden">
        <div className="flex-1 flex items-center gap-2 max-w-sm">
          <Truck className="size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tambah vendor baru cepat..."
            className="flex-1 bg-transparent border-b border-border pb-1 text-sm focus:outline-none focus:border-primary transition-colors"
            value={newVendorName}
            onChange={e => setNewVendorName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickAddVendor()}
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleQuickAddVendor}
            disabled={!newVendorName.trim() || isAddingVendor}
          >
            Tambah
          </Button>
        </div>
      </div>

      <div className="border border-input rounded-lg overflow-hidden print:border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Total Berat</TableHead>
              <TableHead className="text-right">Harga Beli (Nasabah)</TableHead>
              <TableHead className="text-right">Harga Jual (Vendor)</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="print:hidden">Alokasi Kategori</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendorGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Belum ada material yang terkumpul pada sesi ini.</TableCell>
              </TableRow>
            ) : (
              vendorGroups.map(group => (
                <Fragment key={group.vendorId}>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-medium">
                      <button 
                        onClick={() => toggleVendorExpand(group.vendorId)}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        {expandedVendors.has(group.vendorId) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        {group.vendorName}
                        <span className="text-muted-foreground text-xs ml-2">({group.categories.length} kategori)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {group.totalWeight.toFixed(2)} KG
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(group.totalPayout)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-primary">
                      {formatCurrency(group.totalSellPayout)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-green-400">
                      {formatCurrency(group.totalProfit)}
                    </TableCell>
                    <TableCell className="print:hidden"></TableCell>
                  </TableRow>
                  
                  {expandedVendors.has(group.vendorId) && group.categories.map(item => (
                    <TableRow key={item.categoryId} className="bg-background border-l-2 border-primary/20">
                      <TableCell className="pl-12 text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <FileText className="size-4" />
                          {item.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {item.totalWeight} {item.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(item.totalPayout)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-primary/70">
                        {formatCurrency(item.totalSellPayout)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-green-400">
                        {formatCurrency(item.totalSellPayout - item.totalPayout)}
                      </TableCell>
                      <TableCell className="print:hidden">
                        <select
                          className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors appearance-none"
                          value={vendorMappings[item.categoryId] ?? ''}
                          onChange={e => handleVendorChange(item.categoryId, Number(e.target.value))}
                        >
                          <option value="" disabled>Pilih Vendor...</option>
                          {availableVendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
          {categoryItems.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total Keseluruhan</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {summaryText}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(grandTotalBuyPayout)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-bold text-primary">
                  {formatCurrency(grandTotalSellPayout)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-bold text-green-400">
                  {formatCurrency(grandTotalSellPayout - grandTotalBuyPayout)}
                </TableCell>
                <TableCell className="print:hidden"></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {!isFullyAssigned && categoryItems.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-sm flex gap-3 print:hidden">
          <Truck className="w-5 h-5 flex-shrink-0" />
          <p>Beberapa material belum teralokasi ke vendor. Mohon lengkapi alokasi vendor untuk dapat memproses manifest ini.</p>
        </div>
      )}
    </div>
  );
}