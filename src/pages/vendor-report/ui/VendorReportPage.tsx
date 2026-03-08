import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Printer, Truck, FileText, CheckCircle } from 'lucide-react';
import { getEventCategoryTotals, createManifest } from '@/entities/event/api/queries';
import { getEvent } from '@/entities/event/api/queries';
import type { EventCategoryTotal } from '@/entities/event/model/types';
import type { Event } from '@/entities/event/model/types';
import { formatCurrency } from '@/shared/lib/format';
import { getDb } from '@/shared/api';

interface Props {
  eventId: string;
}

export function VendorReportPage({ eventId }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [totals, setTotals] = useState<(EventCategoryTotal & { name: string, unit: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorMappings, setVendorMappings] = useState<Record<string, string>>({});

  // Hardcoded for now. In a real app, this would be fetched from a 'vendors' table.
  const AVAILABLE_VENDORS = [
    { id: 'v-pabrik-kertas', name: 'Pabrik Kertas Nusantara' },
    { id: 'v-pabrik-plastik', name: 'Plastik Daur Ulang Mandiri' },
    { id: 'v-lainnya', name: 'Lainnya (Pengepul Lokal)' },
  ];

  useEffect(() => {
    async function init() {
      try {
        const [e, categoryTotals] = await Promise.all([
          getEvent(eventId),
          getEventCategoryTotals(eventId)
        ]);
        
        const db = await getDb();
        const cats = await db.select<{id: string, name: string, unit: string}[]>('SELECT id, name, unit FROM category');
        
        const totalsWithNames = categoryTotals.map(ct => {
          const cat = cats.find(c => c.id === ct.categoryId);
          return { ...ct, name: cat?.name || 'Unknown', unit: cat?.unit || 'kg' };
        });

        // Initialize default mapping: empty means unassigned
        const initialMapping: Record<string, string> = {};
        totalsWithNames.forEach(t => { initialMapping[t.categoryId] = ''; });

        setEvent(e);
        setTotals(totalsWithNames);
        setVendorMappings(initialMapping);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [eventId]);

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
    
    // In a real implementation this would generate a PDF or lock the event further.
    // For this demonstration, we simulate saving the mapping.
    try {
      setSaving(true);
      // Fallback: any unassigned goes to "Lainnya" internally if they forced it, but UI prevents it
      const assignments = totals.map(t => ({
        categoryId: t.categoryId,
        vendorId: vendorMappings[t.categoryId] || 'v-lainnya'
      }));
      
      await createManifest(eventId, assignments);
      alert('Manifest Laporan Vendor berhasil dibuat!');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat manifest.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'event-details', eventId } }));
  };

  if (loading || !event) return <div className="p-12 animate-pulse">Memuat laporan...</div>;

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
          <button onClick={() => window.print()} className="btn-outline flex items-center gap-2">
            <Printer className="w-4 h-4" /> Cetak PDF
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={!isFullyAssigned || saving || totals.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Truck className="w-4 h-4 animate-bounce" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Memproses...' : 'Proses Manifest'}
          </button>
        </div>
      </header>

      <div className="bg-[#F9F9F8] border border-[#1A1A1A]/10 rounded-lg overflow-hidden print:border-none print:bg-transparent">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1A1A1A]/10">
              <th className="table-header">Kategori Material</th>
              <th className="table-header text-right">Total Berat</th>
              <th className="table-header text-right">Total Biaya (Nasabah)</th>
              <th className="table-header w-64 pl-8 print:hidden">Alokasi Vendor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]/5">
            {totals.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[#1A1A1A]/40">Belum ada material yang terkumpul pada sesi ini.</td>
              </tr>
            ) : (
              totals.map(item => (
                <tr key={item.categoryId} className="group hover:bg-[#1A1A1A]/[0.02] transition-colors">
                  <td className="table-cell font-medium flex items-center gap-3">
                    <FileText className="w-4 h-4 text-[#1A1A1A]/30" />
                    {item.name}
                  </td>
                  <td className="table-cell text-right tabular-nums">
                    {item.totalWeight} {item.unit}
                  </td>
                  <td className="table-cell text-right tabular-nums font-medium">
                    {formatCurrency(item.totalPayout)}
                  </td>
                  <td className="table-cell pl-8 print:hidden">
                    <select
                      className="w-full bg-transparent border border-[#1A1A1A]/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors appearance-none"
                      value={vendorMappings[item.categoryId] || ''}
                      onChange={e => handleVendorChange(item.categoryId, e.target.value)}
                    >
                      <option value="" disabled>Pilih Vendor...</option>
                      {AVAILABLE_VENDORS.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {totals.length > 0 && (
            <tfoot className="bg-[#1A1A1A]/5 font-medium border-t border-[#1A1A1A]/10">
              <tr>
                <td className="table-cell">Total Keseluruhan</td>
                <td className="table-cell text-right tabular-nums">
                  {totals.reduce((sum, item) => sum + item.totalWeight, 0).toFixed(2)} KG
                </td>
                <td className="table-cell text-right tabular-nums">
                  {formatCurrency(totals.reduce((sum, item) => sum + item.totalPayout, 0))}
                </td>
                <td className="table-cell print:hidden"></td>
              </tr>
            </tfoot>
          )}
        </table>
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
