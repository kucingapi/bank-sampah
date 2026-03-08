import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Check, Calculator } from 'lucide-react';
import { getEventRates } from '@/entities/event/api/queries';
import { listMembers } from '@/entities/member/api/queries';
import { createDeposit } from '@/entities/deposit/api/queries';
import type { EventRate } from '@/entities/event/model/types';
import type { Member } from '@/entities/member/model/types';
import { formatCurrency } from '@/shared/lib/format';
import { getDb } from '@/shared/api';

interface Props {
  eventId: string;
}

export function EventEntryPage({ eventId }: Props) {
  const [rates, setRates] = useState<(EventRate & { name: string, unit: string })[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [m, baseRates] = await Promise.all([
          listMembers(),
          getEventRates(eventId)
        ]);
        
        // We need category names for the UI
        const db = await getDb();
        const cats = await db.select<{id: string, name: string, unit: string}[]>('SELECT id, name, unit FROM category');
        
        const ratesWithNames = baseRates.map(r => {
          const cat = cats.find(c => c.id === r.category_id);
          return { ...r, name: cat?.name || 'Unknown', unit: cat?.unit || 'kg' };
        });
        
        setMembers(m);
        setRates(ratesWithNames);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [eventId]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members.slice(0, 5); // Show suggestions
    const q = searchQuery.toLowerCase();
    return members.filter(m => 
      m.id.toLowerCase().includes(q) || 
      m.name.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [members, searchQuery]);

  const currentTotal = useMemo(() => {
    let total = 0;
    Object.entries(weights).forEach(([catId, weight]) => {
      const rate = rates.find(r => r.category_id === catId);
      if (rate && weight > 0) {
        total += rate.active_rate * weight;
      }
    });
    return total;
  }, [weights, rates]);

  const handleWeightChange = (catId: string, value: string) => {
    const num = parseFloat(value);
    setWeights(prev => ({
      ...prev,
      [catId]: isNaN(num) ? 0 : num
    }));
  };

  const handleSubmit = async () => {
    if (!selectedMember || currentTotal <= 0) return;
    
    const itemsToSave = Object.entries(weights)
      .filter(([_, weight]) => weight > 0)
      .map(([categoryId, weight]) => ({ categoryId, weight }));

    if (itemsToSave.length === 0) return;

    try {
      setSaving(true);
      await createDeposit(eventId, selectedMember.id, currentTotal, itemsToSave);
      // Dispatch navigate back to details
      window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'event-details', eventId } }));
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'event-details', eventId } }));
  };

  if (loading) return <div className="p-12 animate-pulse">Memuat terminal...</div>;

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-center gap-6 border-b border-[#1A1A1A]/10 pb-6">
        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-[#1A1A1A]/5 transition-colors text-[#1A1A1A]/50 hover:text-[#1A1A1A]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title text-[#1A1A1A]">Terminal <span className="text-[#1A1A1A]/40">Setoran</span></h1>
          <p className="mt-2 text-[#1A1A1A]/50 text-sm">Pencatatan data timbangan dan kalkulasi otomatis.</p>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-12">
        <div className="col-span-3 space-y-12">
          {/* Member Selection */}
          <section className="space-y-6 relative">
            <h2 className="section-header">Identitas Penyetor</h2>
            
            {!selectedMember ? (
              <div className="relative">
                <Search className="absolute left-0 top-3 border-b border-transparent w-5 h-5 text-[#1A1A1A]/40" />
                <input 
                  type="text" 
                  className="input-editorial pl-8 w-full"
                  placeholder="Cari berdasarkan ID atau Nama..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                
                {filteredMembers.length > 0 && (
                  <div className="absolute top-14 left-0 w-full bg-[#F9F9F8] border border-[#1A1A1A]/10 rounded-xl shadow-2xl overflow-hidden z-10">
                    {filteredMembers.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedMember(m); setSearchQuery(''); }}
                        className="w-full text-left px-4 py-3 hover:bg-[#1A1A1A]/5 flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-[#1A1A1A]/40 font-mono">{m.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-[#1A1A1A]/5 rounded-xl border border-[#1A1A1A]/10">
                <div>
                  <p className="font-medium text-[#1A1A1A]">{selectedMember.name}</p>
                  <p className="text-xs text-[#1A1A1A]/50 font-mono mt-1">ID: {selectedMember.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="text-xs font-medium text-[#1A1A1A]/50 hover:text-[#1A1A1A] underline decoration-[#1A1A1A]/20 underline-offset-4"
                >
                  Ubah Anggota
                </button>
              </div>
            )}
          </section>

          {/* Dynamic Inputs */}
          <section className="space-y-6">
            <h2 className="section-header">Data Timbangan</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {rates.length === 0 ? (
                <div className="col-span-2 py-4 text-sm text-[#1A1A1A]/40">Belum ada sinkronisasi harga kategori.</div>
              ) : (
                rates.map(rate => (
                  <div key={rate.category_id} className="relative group">
                    <label className="micro-label text-[#1A1A1A]/50 mb-1 flex justify-between">
                      {rate.name}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatCurrency(rate.active_rate)}/{rate.unit}
                      </span>
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.0"
                        className="input-editorial w-full pr-8 tabular-nums font-medium"
                        value={weights[rate.category_id] || ''}
                        onChange={(e) => handleWeightChange(rate.category_id, e.target.value)}
                        disabled={!selectedMember}
                      />
                      <span className="absolute right-0 top-3 text-[#1A1A1A]/30 text-sm pointer-events-none uppercase tracking-widest">{rate.unit}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Live Calculation Sidebar */}
        <div className="col-span-2">
          <div className="sticky top-12 p-8 border border-[#1A1A1A]/10 rounded-lg bg-[#F9F9F8] flex flex-col h-[400px]">
            <div className="flex items-center gap-3 mb-8">
              <Calculator className="w-5 h-5 text-[#1A1A1A]/40" />
              <h3 className="section-header">Kalkulasi</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-6">
              {Object.entries(weights).map(([catId, weight]) => {
                const rate = rates.find(r => r.category_id === catId);
                if (!rate || weight <= 0) return null;
                const subtotal = rate.active_rate * weight;
                
                return (
                  <div key={catId} className="flex justify-between items-baseline text-sm animate-in fade-in zoom-in-95">
                    <span className="text-[#1A1A1A]/60">{rate.name}</span>
                    <div className="flex gap-4">
                      <span className="tabular-nums text-[#1A1A1A]/40">{weight} {rate.unit}</span>
                      <span className="tabular-nums font-medium w-24 text-right truncate">{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-[#1A1A1A]/10 mt-auto">
              <p className="micro-label text-[#1A1A1A]/50 mb-2">Total Pembayaran</p>
              <p className="text-3xl font-medium tracking-tight tabular-nums transition-all">
                {formatCurrency(currentTotal)}
              </p>
              
              <button 
                onClick={handleSubmit}
                disabled={!selectedMember || currentTotal <= 0 || saving}
                className="btn-primary w-full mt-8 flex items-center justify-center gap-2"
              >
                {saving ? (
                  'Menyimpan...'
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Catat Setoran
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
