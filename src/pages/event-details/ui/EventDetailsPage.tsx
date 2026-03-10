import { useState, useMemo, useCallback, useEffect } from "react"
import { ArrowLeft, RefreshCw, Plus, FileText, CheckCircle2, Pencil, DollarSign, Archive, RotateCcw, Save } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  useEvent,
  useUpdateEventStatus,
  useSyncEventRates,
  useEventRates,
  useUpdateEventRate,
} from "@/entities/event/api/hooks"
import { useDeposits } from "@/entities/deposit/api/hooks"
import type { Deposit } from "@/entities/deposit/model/types"
import { formatCurrency } from "@/shared/lib/format"
import { getDb } from "@/shared/api"
import { DataTable } from "@/shared/ui/DataTable"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Card, CardContent } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { Badge } from "@/shared/ui/ui/badge"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog"
import { cn } from "@/shared/lib/utils"

interface Props {
  eventId: string
}

interface DepositWithDetails extends Deposit {
  memberName: string
  itemCount: number
}

function EventDetailsPageSkeleton() {
  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div className="flex items-center gap-6">
          <Skeleton className="size-10 rounded-md" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="border border-input rounded-lg overflow-hidden">
            <div className="p-4 bg-muted/30 border-b">
              <div className="grid grid-cols-5 gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0 grid grid-cols-5 gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Skeleton className="h-5 w-32" />
          <Card>
            <CardContent className="flex flex-col gap-6 pt-6">
              <div>
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-32 mt-2" />
              </div>
              <Separator />
              <div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-4 w-full mt-1" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function EventDetailsPage({ eventId }: Props) {
  const [showReactivationWarning, setShowReactivationWarning] = useState(false)
  const [localRates, setLocalRates] = useState<Record<string, { rate: number; active: number }>>({})
  const [ratesLoaded, setRatesLoaded] = useState(false)
  const [categories, setCategories] = useState<Record<string, { name: string; unit: string }>>({})

  const { data: event, isLoading: eventLoading } = useEvent(eventId)
  const { data: deposits = [] } = useDeposits(eventId)
  const { data: ratesData } = useEventRates(eventId)
  const updateStatus = useUpdateEventStatus()
  const syncRates = useSyncEventRates()
  const updateRate = useUpdateEventRate()

  const handleSyncRates = async () => {
    try {
      await syncRates.mutateAsync(eventId)
      setRatesLoaded(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleStatus = async () => {
    if (!event) return
    const newStatus = event.status === "active" ? "finished" : "active"
    
    if (newStatus === "active" && event.status === "finished") {
      setShowReactivationWarning(true)
      return
    }
    
    await updateStatus.mutateAsync({ id: eventId, status: newStatus })
  }

  const handleReactivationConfirm = async () => {
    await updateStatus.mutateAsync({ id: eventId, status: "active" })
    setShowReactivationWarning(false)
  }

  const handleBack = () => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "calendar" } })
    )
  }

  const handleAddDeposit = () => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "event-entry", eventId } })
    )
  }

  const handleEditDeposit = useCallback((depositId: string) => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "event-entry", eventId, depositId } })
    )
  }, [eventId])

  const depositsWithDetails = deposits.map(dd => ({
    ...dd,
    itemCount: (dd as any).itemCount || 0
  })) as DepositWithDetails[]

  const totalPayout = depositsWithDetails.reduce((sum, d) => sum + d.total_payout, 0)

  const columns = useMemo<ColumnDef<DepositWithDetails>[]>(() => [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: "time",
      header: "Waktu",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {new Date(row.original.time).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      accessorKey: "memberName",
      header: "Anggota",
      cell: ({ row }) => row.original.memberName,
    },
    {
      accessorKey: "itemCount",
      header: "Item",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.itemCount} jenis
        </span>
      ),
    },
    {
      accessorKey: "total_payout",
      header: "Total Pembayaran",
      cell: ({ row }) => formatCurrency(row.original.total_payout),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => handleEditDeposit(row.original.id)}
        >
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ], [handleEditDeposit])

  const handleGenerateReport = () => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "vendor-report", eventId } })
    )
  }

  useEffect(() => {
    async function loadRates() {
      if (!ratesData || ratesLoaded) return
      
      const db = await getDb()
      const cats = await db.select<{ id: string; name: string; unit: string }[]>(
        "SELECT id, name, unit FROM category"
      )
      
      const catsMap: Record<string, { name: string; unit: string }> = {}
      cats.forEach(c => {
        catsMap[c.id] = { name: c.name, unit: c.unit }
      })
      setCategories(catsMap)
      
      const initial: Record<string, { rate: number; active: number }> = {}
      ratesData.forEach(r => {
        initial[r.category_id] = { rate: r.active_rate, active: r.is_active }
      })
      setLocalRates(initial)
      setRatesLoaded(true)
    }
    loadRates()
  }, [ratesData, ratesLoaded])

  const handleRateChange = (catId: string, value: string) => {
    const num = parseFloat(value) || 0
    setLocalRates(prev => ({
      ...prev,
      [catId]: { ...prev[catId], rate: num },
    }))
  }

  const handleActiveToggle = (catId: string) => {
    setLocalRates(prev => ({
      ...prev,
      [catId]: { ...prev[catId], active: prev[catId].active === 1 ? 0 : 1 },
    }))
  }

  const handleSaveRates = async () => {
    try {
      await Promise.all(
        Object.entries(localRates).map(([catId, data]) =>
          updateRate.mutateAsync({
            eventId,
            categoryId: catId,
            activeRate: data.rate,
            isActive: data.active
          })
        )
      )
    } catch (err) {
      console.error(err)
    }
  }

  if (eventLoading || !event) {
    return <EventDetailsPageSkeleton />
  }


  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="page-title text-[#1A1A1A]">
              Detail <span className="text-[#1A1A1A]/40">Sesi</span>
            </h1>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="font-medium text-[#1A1A1A]">
                {new Date(event.event_date).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="text-[#1A1A1A]/20">|</span>
              <Badge
                variant={event.status === "active" ? "default" : "secondary"}
                className="cursor-pointer uppercase tracking-wider"
                onClick={handleToggleStatus}
              >
                {event.status === "active" ? (
                  <>
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex size-full rounded-full bg-primary opacity-20" />
                      <span className="relative inline-flex rounded-full size-2 bg-primary" />
                    </span>{" "}
                    AKTIF
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3" /> SELESAI
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {event.status === "active" ? (
            <Button onClick={handleAddDeposit}>
              <Plus />
              Tambah Setoran
            </Button>
          ) : (
            <Button onClick={handleGenerateReport}>
              <FileText className="size-4" />
              Laporan Vendor
            </Button>
          )}
        </div>
      </header>

      {event.status === "active" && (
        <div className="border border-input rounded-lg overflow-hidden">
          <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="size-4" />
              <span className="font-medium">Kategori Nilai Tukar</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSyncRates}
                disabled={syncRates.isPending}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={syncRates.isPending ? "animate-spin size-3" : "size-3"} />
                <span className="ml-2">Sinkronisasi Harga Dasar</span>
              </Button>
              <Button
                onClick={handleSaveRates}
                disabled={updateRate.isPending}
                size="sm"
              >
                <Save className="size-3" />
                <span className="ml-2">Simpan</span>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 p-4">
            {ratesData?.map(rate => {
              const cat = localRates[rate.category_id]
              const catInfo = categories[rate.category_id]
              const isActive = cat?.active !== 0
              return (
                <div
                  key={rate.category_id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-opacity",
                    !isActive ? "opacity-50 bg-muted/30" : "bg-background"
                  )}
                >
                  <div className="flex-1 mr-3">
                    <p className="font-medium text-sm">{catInfo?.name || rate.category_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(rate.active_rate)}/{catInfo?.unit || 'kg'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      value={localRates[rate.category_id]?.rate || ""}
                      onChange={e => handleRateChange(rate.category_id, e.target.value)}
                      disabled={!isActive}
                      min={0}
                      step={catInfo?.unit === "pc" ? 1 : 100}
                    />
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleActiveToggle(rate.category_id)}
                    >
                      {isActive ? (
                        <Archive className="size-3" />
                      ) : (
                        <RotateCcw className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Buku Besar Setoran</h2>
            <span className="text-sm font-medium text-[#1A1A1A]/50">
              {depositsWithDetails.length} transaksi
            </span>
          </div>

          {depositsWithDetails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Plus className="size-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-[#1A1A1A]">
                Belum ada transaksi
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Mulai mencatat setoran dengan tombol "Tambah Setoran"
              </p>
            </div>
          ) : (
            <DataTable columns={columns} data={depositsWithDetails} enableExport exportFilename="event-deposits" />
          )}
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="section-header">Ringkasan Sesi</h2>
          <Card>
            <CardContent className="flex flex-col gap-6 pt-6">
              <div>
                <p className="micro-label text-[#1A1A1A]/50 mb-2">
                  Total Dana Disalurkan
                </p>
                <p className="text-3xl font-medium tracking-tight">
                  {formatCurrency(totalPayout)}
                </p>
              </div>

              <Separator />

              <div>
                <p className="micro-label text-[#1A1A1A]/50 mb-4">
                  Informasi Harga Rate
                </p>
                <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">
                  Harga material pada sesi ini dikunci agar tidak terpengaruh oleh
                  perubahan harga di masa depan. Gunakan tombol "Nilai Tukar Aktif" 
                  untuk mengubah harga per kategori, atau "Sinkronisasi Harga Dasar" 
                  untuk mengambil harga terbaru dari Skema Kategori.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showReactivationWarning}
        onClose={() => setShowReactivationWarning(false)}
        onConfirm={handleReactivationConfirm}
        title="Aktifkan Ulang Sesi?"
        message="Sesi ini sebelumnya telah ditutup (SELESAI). Mengaktifkan kembali akan menghapus semua Laporan Vendor yang telah dibuat. Apakah Anda yakin ingin mengaktifkan ulang sesi ini?"
        confirmLabel="Aktifkan"
        cancelLabel="Batal"
        variant="danger"
      />
    </div>
  )
}
