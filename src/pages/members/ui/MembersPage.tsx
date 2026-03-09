import { useState, useMemo } from "react"
import { Search, Plus, TrendingUp, Calendar as CalendarIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { useMembers } from "@/entities/member/api/hooks"
import type { Member } from "@/entities/member/model/types"
import { formatCurrency } from "@/shared/lib/format"
import { DataTable } from "@/shared/ui/DataTable"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { DateRangePicker } from "@/shared/ui/ui/date-picker-range"
import { Skeleton } from "@/shared/ui/ui/skeleton"

type MemberWithEarnings = Member & { totalEarnings: number }

function MembersPageSkeleton() {
  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </header>

      <div className="flex items-center gap-6 p-4 bg-[#F9F9F8] border border-[#1A1A1A]/10 rounded-lg">
        <Skeleton className="h-10 flex-1" />
        <Separator orientation="vertical" className="h-8" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <div className="border border-input rounded-lg overflow-hidden">
            <div className="p-4 bg-muted/30 border-b">
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0 grid grid-cols-4 gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="bg-[#1A1A1A]">
            <CardHeader>
              <div className="flex items-center gap-3 opacity-70">
                <TrendingUp className="size-4" />
                <CardTitle className="micro-label font-normal">
                  Analisis Anggota
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>
                <Skeleton className="h-3 w-24 bg-white/20" />
                <Skeleton className="h-8 w-16 mt-2 bg-white/30" />
              </div>
              <Separator className="bg-white/10" />
              <div>
                <Skeleton className="h-3 w-20 bg-white/20" />
                <Skeleton className="h-6 w-32 mt-2 bg-white/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  const dateStart = dateRange.from ? dateRange.from.toISOString().split('T')[0] : undefined
  const dateEnd = dateRange.to ? dateRange.to.toISOString().split('T')[0] : undefined

  const { data: members = [], isLoading } = useMembers({
    search: searchQuery,
    dateStart,
    dateEnd
  })

  const stats = useMemo(() => {
    return {
      totalMembers: members.length,
      totalEarnings: members.reduce((sum, m) => sum + (m.totalEarnings || 0), 0),
    }
  }, [members])

  const columns: ColumnDef<MemberWithEarnings>[] = [
    {
      accessorKey: "id",
      header: "ID Nasabah",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Nama Lengkap",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "join_date",
      header: "Tanggal Bergabung",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="size-3" />
          {new Date(row.original.join_date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      ),
    },
    {
      accessorKey: "totalEarnings",
      header: "Total Pendapatan (Rp)",
      cell: ({ row }) => (
        <span className="text-right tabular-nums font-medium block">
          {formatCurrency(row.original.totalEarnings || 0)}
        </span>
      ),
    },
  ]

  if (isLoading && members.length === 0) {
    return <MembersPageSkeleton />
  }

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div>
          <h1 className="page-title text-[#1A1A1A]">
            Direktori <span className="text-[#1A1A1A]/40">Anggota</span>
          </h1>
          <p className="mt-2 text-[#1A1A1A]/50 text-sm">
            Basis data nasabah aktif dan riwayat pendapatan.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button>
            <Plus /> Tambah Anggota
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-6 p-4 bg-[#F9F9F8] border border-[#1A1A1A]/10 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#1A1A1A]/40" />
          <Input
            placeholder="Cari berdasarkan ID atau Nama..."
            className="pl-12 bg-white border-none focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Separator orientation="vertical" className="h-8" />

        <DateRangePicker
          showCompare={false}
          onUpdate={({ range }) => {
            setDateRange({ from: range.from, to: range.to })
          }}
        />
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <DataTable
            columns={columns}
            data={members}
            searchKey="name"
            searchValue={searchQuery}
          />
        </div>

        <div className="flex flex-col gap-6">
          <Card className="bg-[#1A1A1A] text-[#F9F9F8]">
            <CardHeader>
              <div className="flex items-center gap-3 opacity-70">
                <TrendingUp className="size-4" />
                <CardTitle className="micro-label font-normal">
                  Analisis Anggota
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>
                <p className="text-white/50 text-xs mb-1 uppercase tracking-wider">
                  Total Hasil Cari
                </p>
                <p className="text-3xl font-medium tracking-tight tabular-nums">
                  {stats.totalMembers}
                </p>
              </div>

              <Separator className="bg-white/10" />

              <div>
                <p className="text-white/50 text-xs mb-1 uppercase tracking-wider">
                  Total Rp (Filter)
                </p>
                <p className="text-xl font-medium tracking-tight tabular-nums text-green-400">
                  {formatCurrency(stats.totalEarnings)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
