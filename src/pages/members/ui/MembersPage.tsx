import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { listMembers } from '@/entities/member/api/queries';
import type { Member } from '@/entities/member/model/types';
import { formatCurrency } from '@/shared/lib/format';
import { DataTable } from '@/shared/ui/DataTable';
import { Button } from '@/shared/ui/ui/button';

type MemberWithEarnings = Member & { totalEarnings: number };

export function MembersPage() {
  const [members, setMembers] = useState<MemberWithEarnings[]>([]);
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

  const columns: ColumnDef<MemberWithEarnings>[] = [
    {
      accessorKey: 'id',
      header: 'ID Nasabah',
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Nama Lengkap',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'join_date',
      header: 'Tanggal Bergabung',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="size-3" />
          {new Date(row.original.join_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      ),
    },
    {
      accessorKey: 'totalEarnings',
      header: 'Total Pendapatan (Rp)',
      cell: ({ row }) => (
        <span className="text-right tabular-nums font-medium block">
          {formatCurrency(row.original.totalEarnings || 0)}
        </span>
      ),
    },
  ];

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
           {loading && members.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">Memuat data anggota...</div>
           ) : (
             <DataTable columns={columns} data={members} searchKey="name" searchValue={searchQuery} />
           )}
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
