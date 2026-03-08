import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Plus, FileText, CheckCircle2 } from 'lucide-react';
import { getEvent, updateEventStatus, syncEventRates } from '@/entities/event/api/queries';
import { listDeposits } from '@/entities/deposit/api/queries';
import type { Event } from '@/entities/event/model/types';
import type { Deposit } from '@/entities/deposit/model/types';
import { formatCurrency } from '@/shared/lib/format';

interface Props {
  eventId: string;
}

export function EventDetailsPage({ eventId }: Props) {
  const [event, setEvent] = useState<Event | null>(null);
  const [deposits, setDeposits] = useState<(Deposit & { memberName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [e, d] = await Promise.all([
        getEvent(eventId),
        listDeposits(eventId)
      ]);
      setEvent(e);
      setDeposits(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const handleSyncRates = async () => {
    try {
      setSyncing(true);
      await syncEventRates(eventId);
      await fetchData(); // Refresh to show we synced
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!event) return;
    const newStatus = event.status === 'active' ? 'finished' : 'active';
    try {
      await updateEventStatus(eventId, newStatus);
      setEvent({ ...event, status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'calendar' } }));
  };

  const handleAddDeposit = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'event-entry', eventId } }));
  };

  const handleGenerateReport = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'vendor-report', eventId } }));
  };

  if (loading || !event) return <div className="p-12 animate-pulse">Memuat sesi...</div>;

  const totalPayout = deposits.reduce((sum, d) => sum + d.total_payout, 0);

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div className="flex items-center gap-6">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-[#1A1A1A]/5 transition-colors text-[#1A1A1A]/50 hover:text-[#1A1A1A]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title text-[#1A1A1A]">
              Detail <span className="text-[#1A1A1A]/40">Sesi</span>
            </h1>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="font-medium text-[#1A1A1A]">{new Date(event.event_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="text-[#1A1A1A]/20">|</span>
              <button 
                onClick={handleToggleStatus}
                className={`flex items-center gap-2 font-medium px-3 py-1 rounded-full text-xs uppercase tracking-wider transition-colors ${
                  event.status === 'active' 
                    ? 'bg-[#1A1A1A]/5 text-[#1A1A1A] hover:bg-[#1A1A1A]/10' 
                    : 'bg-[#1A1A1A] text-[#F9F9F8] hover:bg-[#1A1A1A]/90'
                }`}
              >
                {event.status === 'active' ? (
                  <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1A1A1A] opacity-20"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#1A1A1A]"></span></span> AKTIF</>
                ) : (
                  <><CheckCircle2 className="w-3 h-3" /> SELESAI</>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {event.status === 'active' ? (
            <>
              <button 
                onClick={handleSyncRates}
                disabled={syncing}
                className="btn-outline flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sinkronisasi...' : 'Sinkronisasi Harga Dasar'}
              </button>
              <button onClick={handleAddDeposit} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Tambah Setoran
              </button>
            </>
          ) : (
            <button onClick={handleGenerateReport} className="btn-primary flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Laporan Vendor
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Buku Besar Setoran</h2>
            <span className="text-sm font-medium text-[#1A1A1A]/50">{deposits.length} transaksi</span>
          </div>
          
          <div className="border border-[#1A1A1A]/10 rounded-lg overflow-hidden bg-[#F9F9F8]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1A1A1A]/10">
                  <th className="table-header">Waktu</th>
                  <th className="table-header">Anggota</th>
                  <th className="table-header text-right">Total Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]/5">
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-[#1A1A1A]/40">Belum ada transaksi di sesi ini.</td>
                  </tr>
                ) : (
                  deposits.map(deposit => (
                    <tr key={deposit.id} className="group hover:bg-[#1A1A1A]/[0.02] transition-colors">
                      <td className="table-cell w-32 tabular-nums">
                        {new Date(deposit.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="table-cell font-medium">{deposit.memberName}</td>
                      <td className="table-cell text-right tabular-nums font-medium">
                        {formatCurrency(deposit.total_payout)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="section-header">Ringkasan Sesi</h2>
          <div className="p-6 border border-[#1A1A1A]/10 rounded-lg bg-[#F9F9F8] space-y-6">
            <div>
              <p className="micro-label text-[#1A1A1A]/50 mb-2">Total Dana Disalurkan</p>
              <p className="text-3xl font-medium tracking-tight">{formatCurrency(totalPayout)}</p>
            </div>
            
            <div className="pt-6 border-t border-[#1A1A1A]/10">
              <p className="micro-label text-[#1A1A1A]/50 mb-4">Informasi Harga Rate</p>
              <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">
                Harga material pada sesi ini dikunci agar tidak terpengaruh oleh perubahan harga di masa depan. Gunakan tombol Sinkronisasi jika Anda baru saja mengubah harga di Skema Kategori.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
