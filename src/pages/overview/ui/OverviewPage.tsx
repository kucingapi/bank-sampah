import { useState, useEffect } from 'react';
import { getDashboardStats, getCategoryBreakdown } from '../api/queries';
import type { DashboardStats, CategoryBreakdown } from '../api/queries';
import { formatCurrency } from '@/shared/lib/format';
import { Calendar, TrendingUp } from 'lucide-react';

export function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats>({ totalWeight: 0, totalPayout: 0, activeMembers: 0 });
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  // For a real app, you'd use a date picker. For this UI, we mock a date range.
  const dateRangeStr = "14 Feb 2026 — 05 Mar 2026";

  useEffect(() => {
    async function fetchStats() {
      try {
        const [s, b] = await Promise.all([
          getDashboardStats(),
          getCategoryBreakdown()
        ]);
        setStats(s);
        setBreakdown(b);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-12 animate-pulse flex space-x-4">Loading dashboard...</div>;
  }

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-12">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div>
          <h1 className="page-title text-[#1A1A1A]">
            Overview <span className="text-[#1A1A1A]/40">Dasbor</span>
          </h1>
          <p className="mt-4 text-[#1A1A1A]/50 text-sm">Ringkasan operasional dan metrik fasilitas.</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 border border-[#1A1A1A]/20 rounded-full hover:bg-[#1A1A1A]/5 transition-colors text-sm font-medium">
          <Calendar className="w-4 h-4 text-[#1A1A1A]/50" />
          {dateRangeStr}
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border border-[#1A1A1A]/10 rounded-lg bg-[#F9F9F8]">
          <p className="micro-label text-[#1A1A1A]/50 mb-4">Total Terkumpul</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-medium tracking-tight">{stats.totalWeight.toLocaleString('id-ID')}</span>
            <span className="text-[#1A1A1A]/50 font-medium">kg</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-[#1A1A1A]" />
            <span className="font-medium">+12.5%</span>
            <span className="text-[#1A1A1A]/40">vs bulan lalu</span>
          </div>
        </div>

        <div className="p-6 border border-[#1A1A1A]/10 rounded-lg bg-[#F9F9F8]">
          <p className="micro-label text-[#1A1A1A]/50 mb-4">Dana Disalurkan</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-medium tracking-tight">{formatCurrency(stats.totalPayout)}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-[#1A1A1A]" />
            <span className="font-medium">+8.2%</span>
            <span className="text-[#1A1A1A]/40">vs bulan lalu</span>
          </div>
        </div>

        <div className="p-6 border border-[#1A1A1A]/10 rounded-lg bg-[#F9F9F8]">
          <p className="micro-label text-[#1A1A1A]/50 mb-4">Anggota Aktif</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-medium tracking-tight">{stats.activeMembers}</span>
            <span className="text-[#1A1A1A]/50 font-medium">entitas</span>
          </div>
        </div>
      </section>

      <section className="space-y-6 pt-6">
        <h2 className="section-header">Komposisi Material</h2>
        <div className="space-y-4">
          {breakdown.length === 0 ? (
            <div className="text-[#1A1A1A]/40 text-sm py-4 border-t border-[#1A1A1A]/5">Belum ada data material tercatat.</div>
          ) : (
            breakdown.map((item) => (
              <div key={item.categoryId} className="flex flex-col gap-2">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex gap-4">
                    <span className="text-[#1A1A1A]/50">{item.totalWeight.toLocaleString('id-ID')} kg</span>
                    <span className="font-medium w-12 text-right">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A]/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#1A1A1A] rounded-full" 
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
