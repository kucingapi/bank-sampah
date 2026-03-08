import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Calendar as CalendarIcon, Filter, TrendingUp } from 'lucide-react';
import { listMembers } from '@/entities/member/api/queries';
import type { Member } from '@/entities/member/model/types';
import { formatCurrency } from '@/shared/lib/format';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/shared/ui/ui/table';
import { Button } from '@/shared/ui/ui/button';

export function MembersPage() {
  const [members, setMembers] = useState<(Member & { totalEarnings: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const fetchMembers = async () => {
    try {
      setLoading(true);
      // Pass the dates to the new integrated query
      const data = await listMembers(searchQuery, startDate || undefined, endDate || undefined);
      setMembers(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 300); // debounce search
    
    return () => clearTimeout(timer);
  }, [searchQuery, startDate, endDate]);

  const stats = useMemo(() => {
    return {
      totalMembers: members.length,
      totalEarnings: members.reduce((sum, m) => sum + (m.totalEarnings || 0), 0)
    };
  }, [members]);

  return (
    <div className="p-12 max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div>
          <h1 className="page-title text-[#1A1A1A]">
            Direktori <span className="text-[#1A1A1A]/40">Anggota</span>
          </h1>
          <p className="mt-2 text-[#1A1A1A]/50 text-sm">Basis data nasabah aktif dan riwayat pendapatan.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <Button data-icon="inline-start">
             <Plus /> Tambah Anggota
           </Button>
         </div>
      </header>

      {/* Advanced Filter Bar */}
      <div className="flex items-center gap-6 p-4 bg-[#F9F9F8] border border-[#1A1A1A]/10 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/40" />
          <input
            type="text"
            placeholder="Cari berdasarkan ID atau Nama..."
            className="w-full bg-transparent border-none focus:ring-0 pl-12 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="w-px h-8 bg-[#1A1A1A]/10"></div>
        
        <div className="flex items-center gap-4 px-4 text-sm">
          <Filter className="w-4 h-4 text-[#1A1A1A]/40" />
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="bg-transparent border-b border-[#1A1A1A]/20 pb-1 text-[#1A1A1A]" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span className="text-[#1A1A1A]/30">—</span>
            <input 
              type="date" 
              className="bg-transparent border-b border-[#1A1A1A]/20 pb-1 text-[#1A1A1A]" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <div className="bg-[#F9F9F8] border border-[#1A1A1A]/10 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1A1A1A]/10">
                  <th className="table-header">ID Nasabah</th>
                  <th className="table-header">Nama Lengkap</th>
                  <th className="table-header">Tanggal Bergabung</th>
                  <th className="table-header text-right">Total Pendapatan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]/5">
                {loading && members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[#1A1A1A]/40">Memuat data anggota...</td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[#1A1A1A]/40">Tidak ada anggota yang ditemukan.</td>
                  </tr>
                ) : (
                  members.map(member => (
                    <tr key={member.id} className="group hover:bg-[#1A1A1A]/[0.02] transition-colors cursor-pointer">
                      <td className="table-cell font-mono text-xs text-[#1A1A1A]/60">
                        {member.id}
                      </td>
                      <td className="table-cell font-medium">
                        {member.name}
                      </td>
                      <td className="table-cell flex items-center gap-2 text-[#1A1A1A]/70">
                        <CalendarIcon className="w-3 h-3 text-[#1A1A1A]/30" />
                        {new Date(member.join_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="table-cell text-right tabular-nums font-medium">
                        {formatCurrency(member.totalEarnings || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 border border-[#1A1A1A]/10 rounded-lg bg-[#1A1A1A] text-[#F9F9F8]">
            <div className="flex items-center gap-3 mb-4 opacity-70">
              <TrendingUp className="w-4 h-4" />
              <h3 className="micro-label">Analisis Anggota</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-white/50 text-xs mb-1 uppercase tracking-wider">Total Hasil Cari</p>
                <p className="text-3xl font-medium tracking-tight tabular-nums">{stats.totalMembers}</p>
              </div>
              
              <div className="pt-6 border-t border-white/10">
                <p className="text-white/50 text-xs mb-1 uppercase tracking-wider">Total Rp (Filter)</p>
                <p className="text-xl font-medium tracking-tight tabular-nums text-green-400">
                  {formatCurrency(stats.totalEarnings)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
