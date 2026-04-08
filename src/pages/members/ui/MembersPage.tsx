import { useState, useMemo } from "react"
import { Search, Plus, TrendingUp, Calendar as CalendarIcon, Download } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { useMembers, useExportDetailedMemberList } from "@/entities/member/api/hooks"
import type { Member } from "@/entities/member/model/types"
import { formatCurrency } from "@/shared/lib/format"
import { DataTable } from "@/shared/ui/DataTable"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { DateRangePicker } from "@/shared/ui/ui/date-picker-range"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { AddMemberModal } from "@/features/add-member/ui/AddMemberModal"

type MemberWithEarnings = Member & { totalEarnings: number }

function TableSkeleton() {
  return (
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
  )
}

function StatsSkeleton() {
  return (
    <Card className="bg-card">
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
          <Skeleton className="h-3 w-24 bg-muted/30" />
          <Skeleton className="h-8 w-16 mt-2 bg-muted/70" />
        </div>
        <Separator className="bg-muted/30" />
        <div>
          <Skeleton className="h-3 w-20 bg-muted/30" />
          <Skeleton className="h-6 w-32 mt-2 bg-muted/70" />
        </div>
      </CardContent>
    </Card>
  )
}

export function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [eventDateRange, setEventDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const eventDateStart = eventDateRange.from ? eventDateRange.from.toISOString().split('T')[0] : undefined
  const eventDateEnd = eventDateRange.to ? eventDateRange.to.toISOString().split('T')[0] : undefined

  const { data: members = [], isLoading } = useMembers({
    search: searchQuery,
    eventDateStart,
    eventDateEnd
  })

  const exportMutation = useExportDetailedMemberList()

  const handleExportDetail = async () => {
    const csv = await exportMutation.mutateAsync({ eventDateStart, eventDateEnd })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `detail-anggota${eventDateStart ? '-range' : ''}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const stats = useMemo(() => {
    return {
      totalMembers: members.length,
      totalEarnings: members.reduce((sum, m) => sum + (m.totalEarnings || 0), 0),
    }
  }, [members])

  const columns = useMemo<ColumnDef<MemberWithEarnings>[]>(() => [
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
  ], [])



  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Direktori <span className="text-muted-foreground/60">Anggota</span>
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Basis data nasabah aktif dan riwayat pendapatan.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus /> Tambah Anggota
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-6 p-4 bg-muted border border-border rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan ID atau Nama..."
            className="pl-12 bg-background border-none focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Separator orientation="vertical" className="h-8" />

        <DateRangePicker
          showCompare={false}
          onUpdate={({ range }) => {
            setEventDateRange({ from: range.from, to: range.to })
          }}
        />

        <Button
          variant="outline"
          onClick={handleExportDetail}
          disabled={exportMutation.isPending}
        >
          <Download className="size-4 mr-2" />
          Export Detail Sesi
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <DataTable
              columns={columns}
              data={members}
              searchKey="name"
              searchValue={searchQuery}
              enableExport
              exportFilename="members-list"
            />
          )}
        </div>

        <div className="flex flex-col gap-6">
          {isLoading ? (
            <StatsSkeleton />
          ) : (
            <Card className="bg-card text-card-foreground">
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
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider">
                    Total Hasil Cari
                  </p>
                  <p className="text-3xl font-medium tracking-tight tabular-nums">
                    {stats.totalMembers}
                  </p>
                </div>

                <Separator className="bg-border" />

                <div>
                  <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider">
                    Total Rp (Filter)
                  </p>
                  <p className="text-xl font-medium tracking-tight tabular-nums text-green-400">
                    {formatCurrency(stats.totalEarnings)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  )
}
