import { useState, useMemo, useCallback } from "react"
import { Search, Download, Eye, PiggyBank } from "lucide-react"
import {
  useMemberSemesterPivot,
  useSemesterSummary,
  useSemesterEvents,
  useMemberPaymentDetails,
  useExportMemberPaymentPivot,
} from "@/entities/member/api/payment-hooks"
import {
  useUpsertSemesterSavings,
} from "@/entities/semester-savings"
import {
  getSemesterOptions,
  getDefaultSemester,
  getPreviousSemester,
  type SemesterLabel,
} from "@/shared/lib/semester"
import { formatCurrency } from "@/shared/lib/format"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/shared/ui/ui/table"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/shared/ui/ui/dialog"

function PivotTableSkeleton({ eventCount }: { eventCount: number }) {
  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <Table className="pivot-table">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky-no bg-muted pr-0" style={{ width: 'var(--pivot-no)' }}><Skeleton className="h-4 w-8" /></TableHead>
            <TableHead className="sticky-nama bg-muted pl-0" style={{ width: 'var(--pivot-nama)' }}><Skeleton className="h-4 w-24" /></TableHead>
            {Array.from({ length: eventCount }).map((_, i) => (
              <TableHead key={i} className="text-right min-w-[6rem]">
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
            <TableHead className="w-32"><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-36"><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-24"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-20"><Skeleton className="h-4 w-6" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="sticky-no bg-background pr-0" style={{ width: 'var(--pivot-no)' }}><Skeleton className="h-4 w-6" /></TableCell>
              <TableCell className="sticky-nama bg-background pl-0" style={{ width: 'var(--pivot-nama)' }}><Skeleton className="h-4 w-32" /></TableCell>
              {Array.from({ length: eventCount }).map((_, j) => (
                <TableCell key={j} className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
              ))}
              <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
              <TableCell className="text-center"><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-6 w-6" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SummaryCards({
  semesterLabel,
}: {
  semesterLabel: SemesterLabel
}) {
  const { data: summary, isLoading } = useSemesterSummary(semesterLabel)

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full bg-muted/30 rounded-lg" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: "Jumlah Semester Ini",
      value: summary.totalSemesterPayout,
      icon: PiggyBank,
      color: "text-green-400",
    },
    {
      label: "Jumlah Ditabung",
      value: summary.totalRolloverSavings,
      icon: PiggyBank,
      color: "text-primary",
    },
    {
      label: "Jumlah Semuanya",
      value: summary.grandTotal,
      icon: PiggyBank,
      color: "text-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border border-border rounded-lg p-4 bg-card flex flex-col gap-1"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {card.label}
          </p>
          <p className={`text-2xl font-semibold tabular-nums ${card.color}`}>
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  )
}

function DetailDialog({
  memberId,
  memberName,
  semesterLabel,
  open,
  onOpenChange,
}: {
  memberId: number
  memberName: string
  semesterLabel: SemesterLabel
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { startDate, endDate } = useMemo(() => {
    const [yearStr, sem] = semesterLabel.split('-')
    const year = parseInt(yearStr, 10)
    if (sem === 'S1') {
      return { startDate: `${year}-01-01`, endDate: `${year}-06-30` }
    }
    return { startDate: `${year}-07-01`, endDate: `${year}-12-31` }
  }, [semesterLabel])

  const { data: details = [], isLoading } = useMemberPaymentDetails(memberId, {
    eventDateStart: startDate,
    eventDateEnd: endDate,
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
  const [semester, setSemester] = useState<SemesterLabel>(getDefaultSemester)
  const [detailMember, setDetailMember] = useState<{ id: number; name: string } | null>(null)

  const semesterOptions = useMemo(() => getSemesterOptions(), [])

  const { data: pivotData = [], isLoading: pivotLoading, error: pivotError } = useMemberSemesterPivot(semester)
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useSemesterEvents(semester)

  const saveMutation = useUpsertSemesterSavings()
  const exportMutation = useExportMemberPaymentPivot()

  const handleSaveToggle = useCallback(async (memberId: number, _memberName: string, semesterPayout: number, currentIsSaved: boolean) => {
    const newIsSaved = !currentIsSaved
    const prevSemester = getPreviousSemester(semester)

    // Calculate the amount to save: current semester payout + any rollover from previous
    const rolloverRow = pivotData.find(p => p.memberId === memberId)
    const rolloverAmount = rolloverRow?.rolloverSavings ?? 0
    const amountToSave = newIsSaved ? semesterPayout + rolloverAmount : 0

    await saveMutation.mutateAsync({
      memberId,
      semesterLabel: semester,
      savedAmount: amountToSave,
      isSaved: newIsSaved,
      rolledFrom: newIsSaved ? prevSemester : null,
    })
  }, [semester, saveMutation, pivotData])

  const handleExport = useCallback(async () => {
    // Build old-style pivot data for export compatibility
    const exportPivotData = pivotData.map(p => ({
      memberId: p.memberId,
      memberName: p.memberName,
      eventPayouts: p.eventPayouts,
      totalPayout: p.semesterPayout + p.rolloverSavings,
      rolloverSavings: 0,
    }))

    const csv = await exportMutation.mutateAsync({ events, pivotData: exportPivotData })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pembayaran-anggota-${semester}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [exportMutation, events, pivotData, semester])

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
            Rekap pembayaran per anggota berdasarkan semester.
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

      <SummaryCards semesterLabel={semester} />

      {(pivotError || eventsError) && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          <p className="font-semibold mb-1">Terjadi error:</p>
          <pre className="whitespace-pre-wrap opacity-80">
            {JSON.stringify(pivotError ?? eventsError, null, 2)}
          </pre>
        </div>
      )}

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

        <Select value={semester} onValueChange={(v) => setSemester(v as SemesterLabel)}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Pilih semester..." />
          </SelectTrigger>
          <SelectContent>
            {semesterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        {isLoading ? (
          <PivotTableSkeleton eventCount={events.length || 4} />
        ) : (
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table className="pivot-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky-no bg-muted pr-0" style={{ width: 'var(--pivot-no)' }}>No</TableHead>
                  <TableHead className="sticky-nama bg-muted pl-0" style={{ width: 'var(--pivot-nama)' }}>Nama</TableHead>
                  {events.map((ev) => (
                    <TableHead key={ev.id} className="text-right min-w-[6rem] whitespace-nowrap">
                      {new Date(ev.event_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold whitespace-nowrap w-32">
                    Ditabung
                  </TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap w-36">
                    Jumlah
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-24">
                    Simpan
                  </TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2 + events.length + 4}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {events.length === 0
                        ? "Belum ada event di semester ini."
                        : "Belum ada data pembayaran."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, idx) => {
                    const total = row.semesterPayout + row.rolloverSavings
                    return (
                      <TableRow key={row.memberId}>
                        <TableCell className="sticky-no bg-background pr-0" style={{ width: 'var(--pivot-no)' }}>
                          <span className="font-mono text-xs text-muted-foreground">{idx + 1}</span>
                        </TableCell>
                        <TableCell className="sticky-nama bg-background pl-0 font-medium" style={{ width: 'var(--pivot-nama)' }}>
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
                        <TableCell className="text-right tabular-nums">
                          {row.rolloverSavings > 0 ? (
                            <span className="text-primary font-medium">
                              {formatCurrency(row.rolloverSavings)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-green-400">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.isSaved ? (
                            <button
                              onClick={() =>
                                handleSaveToggle(row.memberId, row.memberName, row.semesterPayout, row.isSaved)
                              }
                              disabled={saveMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <PiggyBank className="size-3.5" />
                              Tersimpan
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handleSaveToggle(row.memberId, row.memberName, row.semesterPayout, row.isSaved)
                              }
                              disabled={saveMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Simpan
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
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
                    )
                  })
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
          semesterLabel={semester}
          open={!!detailMember}
          onOpenChange={(open) => {
            if (!open) setDetailMember(null)
          }}
        />
      )}
    </div>
  )
}
