import { useState, useMemo } from 'react';
import { ArrowLeft, Printer, Truck, FileText, CheckCircle } from 'lucide-react';
import { useEvent, useEventCategoryTotals } from '@/entities/event/api/hooks';
import { useCreateManifest } from '@/entities/manifest/api/hooks';
import type { EventCategoryTotal } from '@/entities/event/model/types';
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

function VendorReportPageSkeleton() {
  return (
    <div className="p-12 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
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
  const [totals, setTotals] = useState<(EventCategoryTotal & { name: string, unit: string })[]>([]);
  const [vendorMappings, setVendorMappings] = useState<Record<string, string>>({});

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: categoryTotals, isLoading: totalsLoading } = useEventCategoryTotals(eventId);
  const createManifest = useCreateManifest();

  const AVAILABLE_VENDORS = [
    { id: 'v-pabrik-kertas', name: 'Pabrik Kertas Nusantara' },
    { id: 'v-pabrik-plastik', name: 'Plastik Daur Ulang Mandiri' },
    { id: 'v-lainnya', name: 'Lainnya (Pengepul Lokal)' },
  ];

  useMemo(() => {
    async function loadTotals() {
      if (!categoryTotals) return;
      
      const db = await getDb();
      const cats = await db.select<{id: string, name: string, unit: string}[]>('SELECT id, name, unit FROM category');
      
      const totalsWithNames = categoryTotals.map(ct => {
        const cat = cats.find(c => c.id === ct.categoryId);
        return { ...ct, name: cat?.name || 'Unknown', unit: cat?.unit || 'kg' };
      });

      const initialMapping: Record<string, string> = {};
      totalsWithNames.forEach(t => { initialMapping[t.categoryId] = ''; });

      setTotals(totalsWithNames);
      setVendorMappings(initialMapping);
    }
    loadTotals()
  }, [categoryTotals])

  const handleVendorChange = (categoryId: string, vendorId: string) => {
    setVendorMappings(prev => ({
      ...prev,
      [categoryId]: vendorId
    }));
  };

  const isFullyAssigned = useMemo(() => {
    return totals.every(t => vendorMappings[t.categoryId] !== '');
  }, [totals, vendorMappings]);

  const handleSubmit = async () => {
    if (!isFullyAssigned || totals.length === 0) return;
    
    try {
      const assignments = totals.map(t => ({
        categoryId: t.categoryId,
        vendorId: vendorMappings[t.categoryId] || 'v-lainnya'
      }));
      
      await createManifest.mutateAsync({
        eventId,
        vendorId: assignments[0]?.vendorId || 'v-lainnya',
        items: assignments.map(a => ({ category_id: a.categoryId, outbound_rate: 0 }))
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
    const exportData = totals.map(t => ({
      category: t.name,
      total_weight: t.totalWeight,
      unit: t.unit,
      total_payout: t.totalPayout
    }));
    exportToCSV(exportData, 'manifest-report');
  };

  if (eventLoading || totalsLoading || !event) {
    return <VendorReportPageSkeleton />;
  }

  return (
    <div className="p-12 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6 print:border-none">
        <div className="flex items-center gap-6">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-[#1A1A1A]/5 transition-colors text-[#1A1A1A]/50 hover:text-[#1A1A1A] print:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title text-[#1A1A1A]">
              Manifest <span className="text-[#1A1A1A]/40">Keluaran</span>
            </h1>
            <p className="mt-2 text-[#1A1A1A]/50 text-sm">Distribusi penjualan material sesi {new Date(event.event_date).toLocaleDateString('id-ID')}.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 print:hidden">
           <ExportCSVButton onExport={handleExport} filename="manifest" />
           <Button onClick={() => window.print()} variant="outline" data-icon="inline-start">
             <Printer /> Cetak PDF
           </Button>
           <Button 
             onClick={handleSubmit} 
             disabled={!isFullyAssigned || createManifest.isPending || totals.length === 0}
             data-icon="inline-start"
           >
             {createManifest.isPending ? <Truck className="animate-bounce" /> : <CheckCircle />}
             {createManifest.isPending ? 'Memproses...' : 'Proses Manifest'}
           </Button>
         </div>
      </header>

      <div className="border border-input rounded-lg overflow-hidden print:border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori Material</TableHead>
              <TableHead className="text-right">Total Berat</TableHead>
              <TableHead className="text-right">Total Biaya (Nasabah)</TableHead>
              <TableHead className="print:hidden">Alokasi Vendor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {totals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Belum ada material yang terkumpul pada sesi ini.</TableCell>
              </TableRow>
            ) : (
              totals.map(item => (
                <TableRow key={item.categoryId}>
                  <TableCell className="font-medium flex items-center gap-3">
                    <FileText className="size-4 text-muted-foreground" />
                    {item.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.totalWeight} {item.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(item.totalPayout)}
                  </TableCell>
                  <TableCell className="print:hidden">
                    <select
                      className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors appearance-none"
                      value={vendorMappings[item.categoryId] || ''}
                      onChange={e => handleVendorChange(item.categoryId, e.target.value)}
                    >
                      <option value="" disabled>Pilih Vendor...</option>
                      {AVAILABLE_VENDORS.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {totals.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total Keseluruhan</TableCell>
                <TableCell className="text-right tabular-nums">
                  {totals.reduce((sum, item) => sum + item.totalWeight, 0).toFixed(2)} KG
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.reduce((sum, item) => sum + item.totalPayout, 0))}
                </TableCell>
                <TableCell className="print:hidden"></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {!isFullyAssigned && totals.length > 0 && (
        <div className="p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-sm flex gap-3 print:hidden">
          <Truck className="w-5 h-5 flex-shrink-0" />
          <p>Beberapa material belum teralokasi ke vendor. Mohon lengkapi alokasi vendor untuk dapat memproses manifest ini.</p>
        </div>
      )}
    </div>
  );
}
