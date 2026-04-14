import { useState, useMemo, useEffect, Fragment } from 'react';
import { ArrowLeft, Printer, Truck, FileText, CheckCircle, ChevronDown, ChevronRight, Plus, X, AlertTriangle, ChevronsUpDown } from 'lucide-react';
import { useEvent, useEventCategoryTotals, useEventRates } from '@/entities/event/api/hooks';
import { updateEventNotes } from '@/entities/event/api/queries';
import { useVendors, useCreateVendor } from '@/entities/vendor/api/hooks';
import { useCreateManifestsByAssignments, useManifests } from '@/entities/manifest/api/hooks';
import { getOrCreateDefaultVendors } from '@/entities/vendor/api/queries';
import type { EventCategoryTotal } from '@/entities/event/model/types';
import type { Vendor } from '@/entities/vendor/model/types';
import { formatCurrency } from '@/shared/lib/format';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { getDb } from '@/shared/api';
import { Skeleton } from '@/shared/ui/ui/skeleton';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableFooter } from '@/shared/ui/ui/table';
import { ExportCSVButton } from '@/shared/ui/ExportCSVButton';
import { exportToCSV } from '@/shared/lib/csv';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/ui/command';

interface VendorAllocation {
  totalWeight: number;
  categories: string[];
}

function VendorDropdown({
  value,
  onSelect,
  vendors,
  defaultVendorIds,
  allocations,
}: {
  value: number;
  onSelect: (vendorId: number) => void;
  vendors: Vendor[];
  defaultVendorIds: { bsm: number; lainnya: number } | null;
  allocations: Record<number, VendorAllocation>;
}) {
  const [open, setOpen] = useState(false);
  const currentVendor = vendors.find(v => v.id === value) ||
    (value === defaultVendorIds?.bsm ? { id: value, name: 'BSM' } :
     value === defaultVendorIds?.lainnya ? { id: value, name: 'Lainnya' } : null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-8 text-xs justify-between font-normal"
        >
          <span className="truncate">{currentVendor?.name || 'Pilih vendor...'}</span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari vendor..." className="h-8" />
          <CommandList>
            <CommandEmpty>Vendor tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {vendors.map(vendor => {
                const alloc = allocations[vendor.id];
                const hasAllocation = alloc && alloc.totalWeight > 0;
                return (
                  <CommandItem
                    key={vendor.id}
                    value={String(vendor.id)}
                    onSelect={() => {
                      onSelect(vendor.id);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start py-2 px-3"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Truck className="size-3 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{vendor.name}</span>
                      {value === vendor.id && (
                        <CheckCircle className="size-3 ml-auto text-primary shrink-0" />
                      )}
                    </div>
                    {hasAllocation && (
                      <div className="text-xs text-muted-foreground ml-5 mt-0.5 w-full">
                        <span className="tabular-nums">{alloc.totalWeight.toFixed(2)} kg</span>
                        {alloc.categories.length > 0 && (
                          <span className="text-muted-foreground/60 ml-1">
                            · {alloc.categories.slice(0, 2).join(', ')}
                            {alloc.categories.length > 2 && ` +${alloc.categories.length - 2}`}
                          </span>
                        )}
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  eventId: string;
}

interface CategorySplit {
  vendorId: number;
  weight: number;
  outboundRate: number;
}

interface CategoryItem extends EventCategoryTotal {
  name: string;
  unit: string;
  outboundRate: number;
  defaultVendorId: number | null;
}

interface VendorGroup {
  vendorId: number;
  vendorName: string;
  splits: { categoryId: string; categoryName: string; unit: string; weight: number; outboundRate: number; totalPayout: number; totalSellPayout: number }[];
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
  const [categorySplits, setCategorySplits] = useState<Record<string, CategorySplit[]>>({});
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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

  // Compute per-vendor total allocation weight across all categories (for dropdown display)
  const vendorAllocations = useMemo(() => {
    const alloc: Record<number, { totalWeight: number; categories: string[] }> = {};
    availableVendors.forEach(v => {
      alloc[v.id] = { totalWeight: 0, categories: [] };
    });
    Object.entries(categorySplits).forEach(([categoryId, splits]) => {
      splits.forEach(split => {
        if (!alloc[split.vendorId]) {
          alloc[split.vendorId] = {
            totalWeight: 0,
            categories: []
          };
        }
        alloc[split.vendorId].totalWeight += split.weight;
        const item = categoryItems.find(i => i.categoryId === categoryId);
        if (item && !alloc[split.vendorId].categories.includes(item.name)) {
          alloc[split.vendorId].categories.push(item.name);
        }
      });
    });
    return alloc;
  }, [categorySplits, availableVendors, categoryItems]);

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

  // 2. Initialize Category Items and Splits
  useEffect(() => {
    async function initializeSplits() {
      if (!categoryTotals || !defaultVendorIds) return;

      const db = await getDb();
      const cats = await db.select<{ id: string, name: string, unit: string, sort_order: number, default_vendor_id: number | null }[]>('SELECT id, name, unit, sort_order, default_vendor_id FROM category ORDER BY sort_order ASC, name ASC');

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
          outboundRate: outboundRateMap[ct.categoryId] || 0,
          defaultVendorId: cat?.default_vendor_id ?? null,
        };
      });

      // Sort by category sort_order (matches the order configured in Skema Kategori)
      items.sort((a, b) => {
        const catA = cats.find(c => c.id === a.categoryId);
        const catB = cats.find(c => c.id === b.categoryId);
        const orderA = catA?.sort_order ?? Infinity;
        const orderB = catB?.sort_order ?? Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return (catA?.name || '').localeCompare(catB?.name || '');
      });

      setCategoryItems(items);

      const splits: Record<string, CategorySplit[]> = {};

      if (existingManifests && existingManifests.length > 0) {
        existingManifests.forEach(m => {
          m.items.forEach(item => {
            if (!splits[item.category_id]) {
              splits[item.category_id] = [];
            }
            const catTotal = categoryTotals?.find(ct => ct.categoryId === item.category_id);
            const totalWeight = catTotal?.totalWeight || 0;
            splits[item.category_id].push({
              vendorId: m.vendor_id,
              weight: item.weight > 0 ? item.weight : totalWeight,
              outboundRate: item.outbound_rate
            });
          });
        });
      } else {
        items.forEach(item => {
          const vendorId = item.defaultVendorId ?? defaultVendorIds.lainnya;
          splits[item.categoryId] = [{
            vendorId,
            weight: item.totalWeight,
            outboundRate: item.outboundRate
          }];
        });
      }

      setCategorySplits(splits);
    }
    initializeSplits();
  }, [categoryTotals, existingManifests, defaultVendorIds, eventRates]);

  const handleVendorChange = (categoryId: string, splitIndex: number, vendorId: number) => {
    setCategorySplits(prev => {
      const updated = { ...prev };
      if (!updated[categoryId]) return prev;
      updated[categoryId] = updated[categoryId].map((s, i) =>
        i === splitIndex ? { ...s, vendorId } : s
      );
      return updated;
    });
  };

  const handleSplitWeightChange = (categoryId: string, splitIndex: number, weight: number) => {
    setCategorySplits(prev => {
      const updated = { ...prev };
      if (!updated[categoryId]) return prev;
      updated[categoryId] = updated[categoryId].map((s, i) =>
        i === splitIndex ? { ...s, weight } : s
      );
      return updated;
    });
  };

  const handleAddSplit = (categoryId: string) => {
    const item = categoryItems.find(i => i.categoryId === categoryId);
    if (!item) return;
    setCategorySplits(prev => {
      const updated = { ...prev };
      const existing = updated[categoryId] || [];
      const remainingWeight = item.totalWeight - existing.reduce((sum, s) => sum + s.weight, 0);
      if (remainingWeight <= 0) return prev;
      const fallbackVendor = item.defaultVendorId ?? defaultVendorIds?.lainnya ?? 0;
      // If the category's default vendor is already in the splits, use Lainnya
      const vendorToUse = existing.some(s => s.vendorId === fallbackVendor)
        ? (defaultVendorIds?.lainnya ?? 0)
        : fallbackVendor;
      updated[categoryId] = [
        ...existing,
        { vendorId: vendorToUse, weight: remainingWeight, outboundRate: item.outboundRate }
      ];
      return updated;
    });
  };

  const handleRemoveSplit = (categoryId: string, splitIndex: number) => {
    setCategorySplits(prev => {
      const updated = { ...prev };
      if (!updated[categoryId] || updated[categoryId].length <= 1) return prev;
      updated[categoryId] = updated[categoryId].filter((_, i) => i !== splitIndex);
      return updated;
    });
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
      const splits = categorySplits[item.categoryId] || [];
      splits.forEach(split => {
        const vendorId = split.vendorId;
        const vendor = availableVendors.find(v => v.id === vendorId) ||
                       (vendorId === defaultVendorIds?.bsm ? { id: vendorId, name: 'BSM' } :
                        vendorId === defaultVendorIds?.lainnya ? { id: vendorId, name: 'Lainnya' } : null);
        const vendorName = vendor?.name || 'Unknown Vendor';

        if (!groups[vendorId]) {
          groups[vendorId] = {
            vendorId,
            vendorName,
            splits: [],
            totalWeight: 0,
            totalPayout: 0,
            totalSellPayout: 0,
            totalProfit: 0
          };
        }

        const splitPayout = split.weight * (item.totalPayout / item.totalWeight);
        const splitSellPayout = split.weight * split.outboundRate;

        groups[vendorId].splits.push({
          categoryId: item.categoryId,
          categoryName: item.name,
          unit: item.unit,
          weight: split.weight,
          outboundRate: split.outboundRate,
          totalPayout: splitPayout,
          totalSellPayout: splitSellPayout
        });
        groups[vendorId].totalWeight += split.weight;
        groups[vendorId].totalPayout += splitPayout;
        groups[vendorId].totalSellPayout += splitSellPayout;
        groups[vendorId].totalProfit += splitSellPayout - splitPayout;
      });
    });
    
    return Object.values(groups).sort((a, b) => b.totalWeight - a.totalWeight);
  }, [categoryItems, categorySplits, availableVendors, defaultVendorIds]);

  const isFullyAssigned = useMemo(() => {
    return categoryItems.length > 0 && categoryItems.every(item => {
      const splits = categorySplits[item.categoryId];
      if (!splits || splits.length === 0) return false;
      const totalSplitWeight = splits.reduce((sum, s) => sum + s.weight, 0);
      return Math.abs(totalSplitWeight - item.totalWeight) < 0.01;
    });
  }, [categoryItems, categorySplits]);

  const splitErrors = useMemo(() => {
    const errors: string[] = [];
    categoryItems.forEach(item => {
      const splits = categorySplits[item.categoryId];
      if (!splits) return;
      const totalSplitWeight = splits.reduce((sum, s) => sum + s.weight, 0);
      if (Math.abs(totalSplitWeight - item.totalWeight) > 0.01) {
        errors.push(`${item.name}: ${totalSplitWeight.toFixed(2)} / ${item.totalWeight} ${item.unit} (selisih ${Math.abs(totalSplitWeight - item.totalWeight).toFixed(2)})`);
      }
    });
    return errors;
  }, [categoryItems, categorySplits]);

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
        items: group.splits.map(s => ({ category_id: s.categoryId, outbound_rate: s.outboundRate, weight: s.weight }))
      }));

      await createManifests.mutateAsync({
        eventId,
        assignments
      });
      alert('Laporan Vendor berhasil dibuat!');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat laporan.');
    }
  };

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'event-details', eventId } }));
  };

  const handleExport = () => {
    const exportData: { category: string; vendor: string; weight: number; unit: string; outbound_rate: number; total_buy_payout: number; total_sell_payout: number }[] = [];
    categoryItems.forEach(t => {
      const splits = categorySplits[t.categoryId] || [];
      if (splits.length === 0) return;
      splits.forEach(split => {
        const vendor = availableVendors.find(v => v.id === split.vendorId);
        exportData.push({
          category: t.name,
          vendor: vendor?.name || 'Unknown',
          weight: split.weight,
          unit: t.unit,
          outbound_rate: split.outboundRate,
          total_buy_payout: t.totalPayout / t.totalWeight * split.weight,
          total_sell_payout: split.weight * split.outboundRate
        });
      });
    });
    exportToCSV(exportData, 'manifest-report');
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
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
          <p>Laporan sudah dibuat untuk sesi ini. Anda dapat mengubah alokasi vendor dan memproses ulang jika diperlukan.</p>
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
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Total Berat</TableHead>
              <TableHead className="text-right">Harga Beli</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="print:hidden">Alokasi Vendor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Belum ada material yang terkumpul pada sesi ini.</TableCell>
              </TableRow>
            ) : (
              categoryItems.map(item => {
                const splits = categorySplits[item.categoryId] || [];
                const totalSplitWeight = splits.reduce((sum, s) => sum + s.weight, 0);
                const hasError = Math.abs(totalSplitWeight - item.totalWeight) > 0.01;
                const isExpanded = expandedCategories.has(item.categoryId);

                return (
                  <Fragment key={item.categoryId}>
                    <TableRow className={hasError ? "bg-orange-50/50" : "bg-muted/30"}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => toggleCategoryExpand(item.categoryId)}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {item.name}
                          {hasError && (
                            <span className="text-orange-500 text-xs ml-2 font-normal flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {totalSplitWeight.toFixed(2)} / {item.totalWeight} {item.unit}
                            </span>
                          )}
                          {splits.length > 1 && !hasError && (
                            <span className="text-muted-foreground text-xs ml-2">({splits.length} vendor)</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {item.totalWeight} {item.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.totalPayout)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-primary">
                        {formatCurrency(item.totalSellPayout)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-green-400">
                        {formatCurrency(item.totalSellPayout - item.totalPayout)}
                      </TableCell>
                      <TableCell className="print:hidden"></TableCell>
                    </TableRow>

                    {isExpanded && splits.map((split, idx) => {
                      const splitPayout = item.totalPayout / item.totalWeight * split.weight;
                      const splitSellPayout = split.weight * split.outboundRate;
                      const vendor = availableVendors.find(v => v.id === split.vendorId) ||
                                    (split.vendorId === defaultVendorIds?.bsm ? { name: 'BSM' } :
                                     split.vendorId === defaultVendorIds?.lainnya ? { name: 'Lainnya' } : { name: 'Unknown' });

                      return (
                        <TableRow key={`${item.categoryId}-${idx}`} className="bg-background border-l-4 border-primary/20">
                          <TableCell className="pl-12">
                            <div className="flex items-center gap-3">
                              <Truck className="size-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{vendor.name}</span>
                              <button
                                onClick={() => handleRemoveSplit(item.categoryId, idx)}
                                className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                                disabled={splits.length <= 1}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="print:hidden">
                            <Input
                              type="number"
                              step={item.unit === 'pc' ? '1' : '0.01'}
                              min={0}
                              max={item.totalWeight}
                              value={split.weight}
                              onChange={e => handleSplitWeightChange(item.categoryId, idx, parseFloat(e.target.value) || 0)}
                              className="w-28 text-right tabular-nums h-8"
                            />
                            <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {formatCurrency(splitPayout)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-primary/70">
                            {formatCurrency(splitSellPayout)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-green-400">
                            {formatCurrency(splitSellPayout - splitPayout)}
                          </TableCell>
                          <TableCell className="print:hidden">
                            <VendorDropdown
                              value={split.vendorId}
                              onSelect={(vendorId) => handleVendorChange(item.categoryId, idx, vendorId)}
                              vendors={availableVendors}
                              defaultVendorIds={defaultVendorIds}
                              allocations={vendorAllocations}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {isExpanded && (
                      <TableRow className="bg-background border-l-4 border-dashed border-muted">
                        <TableCell colSpan={6} className="pl-12">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddSplit(item.categoryId)}
                            className="text-muted-foreground hover:text-primary h-7 px-2"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Tambah vendor lain
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
          {vendorGroups.length > 0 && (
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Total per Vendor</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="print:hidden"></TableCell>
              </TableRow>
              {vendorGroups.map(group => (
                <TableRow key={group.vendorId} className="border-t border-border">
                  <TableCell className="pl-4 font-medium">
                    <Truck className="w-4 h-4 text-muted-foreground inline mr-2" />
                    {group.vendorName}
                    <span className="text-muted-foreground text-xs ml-2">({group.splits.length} alokasi)</span>
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
              ))}
              <TableRow className="border-t-2 border-primary/30 font-bold">
                <TableCell>Total Keseluruhan</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {summaryText}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(grandTotalBuyPayout)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-primary">
                  {formatCurrency(grandTotalSellPayout)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-green-400">
                  {formatCurrency(grandTotalSellPayout - grandTotalBuyPayout)}
                </TableCell>
                <TableCell className="print:hidden"></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {splitErrors.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-sm flex gap-3 print:hidden">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Alokasi belum lengkap:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {splitErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      {!isFullyAssigned && splitErrors.length === 0 && categoryItems.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-sm flex gap-3 print:hidden">
          <Truck className="w-5 h-5 flex-shrink-0" />
          <p>Beberapa material belum teralokasi ke vendor. Klik baris kategori untuk melihat dan mengubah alokasi.</p>
        </div>
      )}
    </div>
  );
}