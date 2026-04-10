import { useState, useMemo, useCallback } from "react"
import { Search, Download, Eye } from "lucide-react"
import {
  useMemberPaymentPivot,
  useEventsInRange,
  useMemberPaymentDetails,
  useExportMemberPaymentPivot,
} from "@/entities/member/api/payment-hooks"
import { formatCurrency } from "@/shared/lib/format"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/shared/ui/ui/table"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { DateRangePicker } from "@/shared/ui/ui/date-picker-range"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/shared/ui/ui/dialog"

function PivotTableSkeleton({ eventCount }: { eventCount: number }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="p-4 bg-muted/30 border-b">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-10 shrink-0" />
          <Skeleton className="h-4 w-28 shrink-0" />
          {Array.from({ length: eventCount }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24 min-w-[6rem]" />
          ))}
          <Skeleton className="h-4 w-28 shrink-0" />
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border-b last:border-b-0 flex gap-4">
          <Skeleton className="h-4 w-10 shrink-0" />
          <Skeleton className="h-4 w-32 shrink-0" />
          {Array.from({ length: eventCount }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-24 min-w-[6rem]" />
          ))}
          <Skeleton className="h-4 w-28 shrink-0" />
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function DetailDialog({
  memberId,
  memberName,
  eventDateStart,
  eventDateEnd,
  open,
  onOpenChange,
}: {
  memberId: number
  memberName: string
  eventDateStart?: string
  eventDateEnd?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: details = [], isLoading } = useMemberPaymentDetails(memberId, {
    eventDateStart,
    eventDateEnd,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detail Pembayaran — {memberName}
          </DialogTitle>
          <DialogClose />
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-muted/30" />
            ))}
          </div>
        ) : details.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Tidak ada data detail.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {details.map((deposit) => (
              <div key={deposit.depositId} className="border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-muted/30 border-b border-border">
                  <p className="text-sm font-medium">
                    {new Date(deposit.eventDate).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Berat (Kg)</TableHead>
                      <TableHead className="text-right">Rate (Rp/Kg)</TableHead>
                      <TableHead className="text-right">Pembayaran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposit.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.categoryName}</TableCell>
                        <TableCell className="text-right tabular-nums">{item.weight.toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-green-400">
                          {formatCurrency(item.payout)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={3} className="font-semibold text-right">
                        Total
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-green-400">
                        {formatCurrency(deposit.totalPayout)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function MemberPaymentPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [eventDateRange, setEventDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [detailMember, setDetailMember] = useState<{ id: number; name: string } | null>(null)

  const eventDateStart = eventDateRange.from ? eventDateRange.from.toISOString().split('T')[0] : undefined
  const eventDateEnd = eventDateRange.to ? eventDateRange.to.toISOString().split('T')[0] : undefined

  const { data: events = [], isLoading: eventsLoading } = useEventsInRange({
    eventDateStart,
    eventDateEnd,
  })

  const { data: pivotData = [], isLoading: pivotLoading } = useMemberPaymentPivot({
    eventDateStart,
    eventDateEnd,
  })

  const exportMutation = useExportMemberPaymentPivot()

  const handleExport = useCallback(async () => {
    const csv = await exportMutation.mutateAsync({ events, pivotData })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pembayaran-anggota${eventDateStart ? '-range' : ''}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [exportMutation, events, pivotData, eventDateStart])

  const filteredData = useMemo(() => {
    if (!searchQuery) return pivotData
    const query = searchQuery.toLowerCase()
    return pivotData.filter(
      (p) =>
        p.memberName.toLowerCase().includes(query) ||
        p.memberId.toString().includes(query)
    )
  }, [pivotData, searchQuery])

  const isLoading = eventsLoading || pivotLoading

  return (
    <div className="p-12 mx-auto flex flex-col gap-8 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Pembayaran <span className="text-muted-foreground/60">Anggota</span>
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Rekap pembayaran per anggota berdasarkan sesi penyetoran.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportMutation.isPending || filteredData.length === 0}
          >
            <Download className="size-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-6 p-4 bg-muted border border-border rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan ID, Nama, atau Alamat..."
            className="pl-12 bg-background border-none focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <DateRangePicker
          showCompare={false}
          onUpdate={({ range }) => {
            setEventDateRange({ from: range.from, to: range.to })
          }}
        />
      </div>

      <div>
        {isLoading ? (
          <PivotTableSkeleton eventCount={8} />
        ) : (
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 sticky left-0 bg-muted/50 z-10 border-r border-border">No</TableHead>
                  <TableHead className="w-48 sticky left-12 bg-muted/50 z-10 border-r border-border">Nama</TableHead>
                  {events.map((ev) => (
                    <TableHead key={ev.id} className="text-right min-w-[6rem] whitespace-nowrap">
                      {new Date(ev.event_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold border-l border-border">
                    Jumlah
                  </TableHead>
                  <TableHead className="w-20 border-l border-border"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2 + events.length + 2}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {events.length === 0
                        ? "Pilih rentang tanggal untuk melihat data."
                        : "Belum ada data pembayaran."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, idx) => (
                    <TableRow key={row.memberId}>
                      <TableCell className="sticky left-0 bg-background z-10 border-r border-border">
                        <span className="font-mono text-xs text-muted-foreground">{idx + 1}</span>
                      </TableCell>
                      <TableCell className="sticky left-12 bg-background z-10 border-r border-border font-medium">
                        {row.memberName}
                      </TableCell>
                      {events.map((ev) => (
                        <TableCell key={ev.id} className="text-right tabular-nums">
                          {row.eventPayouts[ev.id] ? (
                            <span className="text-green-400">
                              {formatCurrency(row.eventPayouts[ev.id])}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums font-semibold border-l border-border text-green-400">
                        {formatCurrency(row.totalPayout)}
                      </TableCell>
                      <TableCell className="border-l border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => setDetailMember({ id: row.memberId, name: row.memberName })}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {detailMember && (
        <DetailDialog
          memberId={detailMember.id}
          memberName={detailMember.name}
          eventDateStart={eventDateStart}
          eventDateEnd={eventDateEnd}
          open={!!detailMember}
          onOpenChange={(open) => {
            if (!open) setDetailMember(null)
          }}
        />
      )}
    </div>
  )
}
