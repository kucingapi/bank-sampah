import { useState, useMemo } from "react"
import { Search, Plus, TrendingUp, Download } from "lucide-react"
import { useMembers, useExportDetailedMemberList, useUpdateMember } from "@/entities/member/api/hooks"
import type { Member } from "@/entities/member/model/types"
import { formatCurrency } from "@/shared/lib/format"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { DateRangePicker } from "@/shared/ui/ui/date-picker-range"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { AddMemberModal } from "@/features/add-member/ui/AddMemberModal"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/shared/ui/ui/table"

function TableSkeleton() {
  return (
    <div className="border border-input rounded-lg overflow-hidden">
      <div className="p-4 bg-muted/30 border-b">
        <div className="grid grid-cols-5 gap-4">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border-b last:border-b-0 grid grid-cols-5 gap-4">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
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

  const updateMember = useUpdateMember()

  const handleUpdate = async (id: number, field: keyof Pick<Member, 'name' | 'address' | 'phone'>, value: string) => {
    try {
      await updateMember.mutateAsync({ id, updates: { [field]: value } })
    } catch (err) {
      console.error("Update failed", err)
    }
  }


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
          Export Detail Penyetoran
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <div className="border border-input rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ID</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>No. Telepon</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        Belum ada anggota.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{m.id}</span>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="font-medium bg-transparent border-none focus-visible:ring-1 h-8"
                            value={m.name}
                            onChange={(e) => handleUpdate(m.id, "name", e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                handleUpdate(m.id, "name", e.target.value.trim())
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="bg-transparent border-none focus-visible:ring-1 h-8 text-muted-foreground"
                            value={m.address || ""}
                            placeholder="—"
                            onChange={(e) => handleUpdate(m.id, "address", e.target.value)}
                            onBlur={(e) => handleUpdate(m.id, "address", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="bg-transparent border-none focus-visible:ring-1 h-8 tabular-nums text-muted-foreground"
                            value={m.phone || ""}
                            placeholder="—"
                            onChange={(e) => handleUpdate(m.id, "phone", e.target.value)}
                            onBlur={(e) => handleUpdate(m.id, "phone", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums font-medium">
                            {formatCurrency(m.totalEarnings || 0)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
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
