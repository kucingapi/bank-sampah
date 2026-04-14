import { useState, useMemo, useCallback, useEffect } from "react"
import { ArrowLeft, RefreshCw, Plus, FileText, CheckCircle2, Pencil, DollarSign, Archive, RotateCcw, Save, AlertCircle, X, Trash2 } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import {
  useEvent,
  useUpdateEventStatus,
  useSyncEventRates,
  useEventRates,
  useUpdateEventRate,
  useDeleteEvent,
} from "@/entities/event/api/hooks"
import { useDeposits } from "@/entities/deposit/api/hooks"
import { useHasManifest, useDeleteManifestsByEvent } from "@/entities/manifest/api/hooks"
import { queryKeys } from "@/shared/api/query-keys"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/ui/alert-dialog"
import { EditDepositModal } from "@/features/edit-deposit/ui/EditDepositModal"
import { AddDepositModal } from "@/features/add-deposit/ui/AddDepositModal"
import { AllRatesModal } from "@/features/edit-deposit/ui/AllRatesModal"
import { cn } from "@/shared/lib/utils"

interface Props {
  eventId: string
}

interface DepositWithDetails extends Deposit {
  memberName: string
  itemCount: number
  items: { category_id: string; category_name: string; weight: number; payout: number; unit: string }[]
}

function EventDetailsPageSkeleton() {
  return (
    <div className="p-12 mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-border pb-6">
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
          <div className="border border-border rounded-lg overflow-hidden">
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
  const queryClient = useQueryClient()
  const [showReactivationWarning, setShowReactivationWarning] = useState(false)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [showActiveSessionConflict, setShowActiveSessionConflict] = useState(false)
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null)
  const [showAddDeposit, setShowAddDeposit] = useState(false)
  const [localRates, setLocalRates] = useState<Record<string, { buyRate: number; sellRate: number; active: number }>>({})
  const [savedRates, setSavedRates] = useState<Record<string, { buyRate: number; sellRate: number; active: number }>>({})
  const [ratesLoaded, setRatesLoaded] = useState(false)
  const [categories, setCategories] = useState<Record<string, { name: string; unit: string }>>({})
  const [isEditingRates, setIsEditingRates] = useState(false)
  const [showAllRatesModal, setShowAllRatesModal] = useState(false)

  const { data: event, isLoading: eventLoading } = useEvent(eventId)
  const { data: deposits = [] } = useDeposits(eventId)
  const { data: ratesData } = useEventRates(eventId)
  const { data: hasManifest } = useHasManifest(eventId)
  const updateStatus = useUpdateEventStatus()
  const syncRates = useSyncEventRates()
  const updateRate = useUpdateEventRate()
  const deleteManifests = useDeleteManifestsByEvent()
  const deleteEvent = useDeleteEvent()

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
    try {
      if (hasManifest) {
        await deleteManifests.mutateAsync(eventId)
      }
      await updateStatus.mutateAsync({ id: eventId, status: "active" })
      setShowReactivationWarning(false)
    } catch (err) {
      if (err instanceof Error && err.message.includes("Sesi aktif lain masih berjalan")) {
        setShowActiveSessionConflict(true)
      } else {
        console.error(err)
      }
    }
  }

  const handleDeleteEvent = async () => {
    try {
      await deleteEvent.mutateAsync(eventId)
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: { view: "calendar" } })
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleBack = () => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "calendar" } })
    )
  }

  const handleAddDeposit = () => {
    setShowAddDeposit(true)
  }

  const handleEditDeposit = useCallback((depositId: string) => {
    setEditingDepositId(depositId)
  }, [])

  const depositsWithDetails = deposits.map(dd => ({
    ...dd,
    itemCount: (dd as any).itemCount || 0,
    items: (dd as any).items || []
  })) as DepositWithDetails[]

  const totalPayout = depositsWithDetails.reduce((sum, d) => sum + d.total_payout, 0)

  const ratesWithNames = useMemo(() => {
    return (ratesData || []).map(rate => ({
      category_id: rate.category_id,
      active_rate: rate.active_rate,
      outbound_rate: rate.outbound_rate,
      is_active: rate.is_active,
      name: categories[rate.category_id]?.name || rate.category_id,
      unit: categories[rate.category_id]?.unit || 'kg',
    }))
  }, [ratesData, categories])

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
      cell: ({ row }) => (
        <div className="max-w-[150px] truncate" title={row.original.memberName}>
          {row.original.memberName}
        </div>
      ),
    },
    {
      accessorKey: "items",
      header: "Detail Item",
      cell: ({ row }) => {
        const items = row.original.items || []
        return (
          <div className="overflow-x-auto scrollbar-thin">
            <div className="flex gap-1 min-w-max">
              {items.map((item) => (
                <div
                  key={item.category_id}
                  className="inline-flex items-center gap-1.5 p-1 rounded-lg bg-muted/50 border border-border/50 text-xs whitespace-nowrap"
                >
                  <span className="font-medium text-foreground">{item.category_name}</span>
                  <span className="text-muted-foreground/20">=</span> 
                  <span className="font-semibold tabular-nums text-foreground">
                    {item.weight.toLocaleString("id-ID", {
                      minimumFractionDigits: item.unit === "pc" ? 0 : 2,
                      maximumFractionDigits: item.unit === "pc" ? 0 : 2
                    })} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      },
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
          className="h-8 w-8 group-hover:opacity-100 transition-opacity text-foreground hover:bg-accent"
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
      
      const initial: Record<string, { buyRate: number; sellRate: number; active: number }> = {}
      ratesData.forEach(r => {
        initial[r.category_id] = { buyRate: r.active_rate, sellRate: r.outbound_rate, active: r.is_active }
      })
      setLocalRates(initial)
      setSavedRates(initial)
      setRatesLoaded(true)
    }
    loadRates()
  }, [ratesData, ratesLoaded])

  const handleSellRateChange = (catId: string, value: string) => {
    const num = parseFloat(value) || 0
    const buyRate = Math.floor(num * 0.90)
    setLocalRates(prev => ({
      ...prev,
      [catId]: { ...prev[catId], sellRate: num, buyRate },
    }))
  }

  const handleBuyRateChange = (catId: string, value: string) => {
    const num = parseFloat(value) || 0
    setLocalRates(prev => ({
      ...prev,
      [catId]: { ...prev[catId], buyRate: num },
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
            activeRate: data.buyRate,
            outboundRate: data.sellRate,
            isActive: data.active
          })
        )
      )
      
      // Invalidate all queries that depend on rates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.deposits.byEvent(eventId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events.categoryTotals(eventId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.members.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() }),
      ])
      
      setSavedRates(localRates)
      setIsEditingRates(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleEditRates = () => {
    if (isEditingRates) {
      setLocalRates(savedRates)
      setIsEditingRates(false)
    } else {
      setIsEditingRates(true)
    }
  }

  const hasUnsavedChanges = Object.keys(localRates).some(
    catId =>
      localRates[catId].buyRate !== savedRates[catId]?.buyRate ||
      localRates[catId].sellRate !== savedRates[catId]?.sellRate ||
      localRates[catId].active !== savedRates[catId]?.active
  )

  if (eventLoading || !event) {
    return <EventDetailsPageSkeleton />
  }


  return (
    <div className="p-12 mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Detail <span className="text-muted-foreground/60">Penyetoran</span>
            </h1>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="font-medium text-foreground">
                {new Date(event.event_date).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="text-muted-foreground/20">|</span>
              <Badge
                variant={event.status === "active" ? "default" : "secondary"}
                className="uppercase tracking-wider"
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
                    <CheckCircle2 className="size-3 mr-1" /> SELESAI
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {event.status === "active" ? (
            <Button
              onClick={() => updateStatus.mutate({ id: eventId, status: "finished" })}
              variant="outline"
            >
              <CheckCircle2 className="size-4 mr-2" />
              Selesai
            </Button>
          ) : (
            <Button
              onClick={handleToggleStatus}
            >
              Aktifkan
            </Button>
          )}
          {event.status === "finished" && (
            <Button onClick={handleGenerateReport} variant={hasManifest === false ? "outline" : "default"} >
              {hasManifest === false && <AlertCircle className="size-4 mr-2" />}
              <FileText className="size-4" />
              Laporan Vendor
              {hasManifest === false && <span className="ml-2 text-xs">(Belum Ada)</span>}
            </Button>
          )}
          <Button
            onClick={() => setShowDeleteWarning(true)}
            variant="destructive"
          >
            <Trash2 className="size-4 " />
            Hapus Sesi
          </Button>
        </div>
      </header>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted/30 border-b border-b-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="size-4" />
            <span className="font-medium">Kategori Nilai Tukar</span>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                Belum Disimpan
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncRates}
              disabled={syncRates.isPending || !isEditingRates}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={syncRates.isPending ? "animate-spin size-3" : "size-3"} />
              <span className="ml-2">Sinkronisasi Harga Dasar</span>
            </Button>
            {isEditingRates && (
              <Button
                onClick={handleToggleEditRates}
                disabled={updateRate.isPending}
                size="sm"
                variant="outline"
              >
                <X className="size-3" />
                <span className="ml-2">Batal</span>
              </Button>
            )}
            <Button
              onClick={isEditingRates ? handleSaveRates : handleToggleEditRates}
              disabled={updateRate.isPending}
              size="sm"
              variant={isEditingRates ? "default" : "outline"}
              className={isEditingRates ? "bg-foreground hover:bg-foreground/80" : ""}
            >
              <Save className="size-3" />
              <span className="ml-2">{isEditingRates ? "Simpan" : "Edit"}</span>
            </Button>
          </div>
        </div>
          <div className="p-4">
            {/* Horizontal scrollable single row */}
            <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2">
              {ratesData?.map(rate => {
                const cat = localRates[rate.category_id]
                const catInfo = categories[rate.category_id]
                const isActive = cat?.active !== 0
                return (
                  <div
                    key={rate.category_id}
                    className={cn(
                      "flex-shrink-0 w-72 flex flex-col gap-3 p-4 rounded-lg border transition-opacity",
                      !isActive ? "opacity-50 bg-muted/30" : "bg-background"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{catInfo?.name || rate.category_id}</p>
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        disabled={!isEditingRates}
                        onClick={() => handleActiveToggle(rate.category_id)}
                      >
                        {isActive ? (
                          <Archive className="size-3" />
                        ) : (
                          <RotateCcw className="size-3" />
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Jual ke Vendor</label>
                        <Input
                          type="number"
                          className="w-full h-9 text-sm tabular-nums"
                          value={cat?.sellRate ?? rate.outbound_rate}
                          onChange={e => handleSellRateChange(rate.category_id, e.target.value)}
                          disabled={!isActive || !isEditingRates}
                          min={0}
                          step={catInfo?.unit === "pc" ? 1 : 100}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(cat?.sellRate ?? rate.outbound_rate)}/{catInfo?.unit || 'kg'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Beli dari Nasabah</label>
                        <Input
                          type="number"
                          className="w-full h-9 text-sm tabular-nums"
                          value={cat?.buyRate ?? rate.active_rate}
                          onChange={e => handleBuyRateChange(rate.category_id, e.target.value)}
                          disabled={!isActive || !isEditingRates}
                          min={0}
                          step={catInfo?.unit === "pc" ? 1 : 100}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(cat?.buyRate ?? rate.active_rate)}/{catInfo?.unit || 'kg'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Lihat Semua button */}
            {ratesData && ratesData.length > 4 && (
              <div className="flex justify-center mt-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllRatesModal(true)}
                >
                  Lihat Semua ({ratesData.length} kategori)
                </Button>
              </div>
            )}
          </div>
        </div>

      <div className="flex flex-col gap-6">
        {/* Ringkasan Sesi - Full width summary at top */}
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="micro-label text-muted-foreground mb-2">
                Total Dana Disalurkan
              </p>
              <p className="text-3xl font-medium tracking-tight">
                {formatCurrency(totalPayout)}
              </p>
            </div>
            <div className="text-right">
              <p className="micro-label text-muted-foreground mb-2">
                {depositsWithDetails.length} Transaksi
              </p>
              <p className="text-sm text-muted-foreground">
                {new Set(depositsWithDetails.map(d => d.memberName)).size} Anggota Unik
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Full width table */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-header">Transaksi Setoran</h2>
            <span className="text-sm font-medium text-muted-foreground">
              Detail setiap transaksi penyetoran
            </span>
          </div>
          {event.status === "active" && (
            <Button onClick={handleAddDeposit}>
              <Plus />
              Tambah Setoran
            </Button>
          )}
        </div>

        {depositsWithDetails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/10">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Plus className="size-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">
              Belum ada transaksi
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Mulai mencatat setoran dengan tombol "Tambah Setoran"
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={depositsWithDetails}
            enableExport
            exportFilename="event-deposits"
            searchKey="memberName"
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={showReactivationWarning}
        onClose={() => setShowReactivationWarning(false)}
        onConfirm={handleReactivationConfirm}
        title="Aktifkan Ulang Sesi?"
        message="Sesi ini sebelumnya telah ditutup (SELESAI). Mengaktifkan kembali akan menghapus semua Laporan Vendor yang telah dibuat. Harga jual ke vendor akan otomatis dihitung dengan margin 10% dari harga beli. Apakah Anda yakin ingin mengaktifkan ulang sesi ini?"
        confirmLabel="Aktifkan"
        cancelLabel="Batal"
        variant="primary"
      />

      <ConfirmDialog
        isOpen={showDeleteWarning}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteEvent}
        title="Hapus Sesi?"
        message="Tindakan ini akan menghapus sesi secara permanen beserta semua data setoran, item setoran, rate acara, dan Laporan vendor. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus Sesi"
        cancelLabel="Batal"
        variant="danger"
      />

      <AlertDialog open={showActiveSessionConflict} onOpenChange={setShowActiveSessionConflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tidak Dapat Mengaktifkan Sesi</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Ada sesi aktif lain yang masih berjalan. Selesaikan sesi tersebut terlebih dahulu sebelum mengaktifkan sesi ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>
              Mengerti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddDepositModal
        isOpen={showAddDeposit}
        onClose={() => setShowAddDeposit(false)}
        eventId={eventId}
      />

      <EditDepositModal
        isOpen={!!editingDepositId}
        onClose={() => setEditingDepositId(null)}
        eventId={eventId}
        depositId={editingDepositId || ""}
      />

      <AllRatesModal
        isOpen={showAllRatesModal}
        onClose={() => setShowAllRatesModal(false)}
        rates={ratesWithNames}
        isEditingRates={isEditingRates}
        localRates={localRates}
        _savedRates={savedRates}
        categories={categories}
        onSellRateChange={handleSellRateChange}
        onBuyRateChange={handleBuyRateChange}
        onActiveToggle={handleActiveToggle}
        onSyncRates={handleSyncRates}
        onSaveRates={handleSaveRates}
        onToggleEdit={handleToggleEditRates}
        isSyncPending={syncRates.isPending}
        isSavePending={updateRate.isPending}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div>
  )
}
