import { useState } from "react"
import { ArrowLeft, RefreshCw, Plus, FileText, CheckCircle2, Pencil, DollarSign } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  useEvent,
  useUpdateEventStatus,
  useSyncEventRates,
} from "@/entities/event/api/hooks"
import { useDeposits } from "@/entities/deposit/api/hooks"
import type { Deposit } from "@/entities/deposit/model/types"
import { formatCurrency } from "@/shared/lib/format"
import { DataTable } from "@/shared/ui/DataTable"
import { Button } from "@/shared/ui/ui/button"
import { Card, CardContent } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { Badge } from "@/shared/ui/ui/badge"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog"
import { DailyRatesEditor } from "./DailyRatesEditor"

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
  const [showRatesEditor, setShowRatesEditor] = useState(false)

  const { data: event, isLoading: eventLoading } = useEvent(eventId)
  const { data: deposits = [] } = useDeposits(eventId)
  const updateStatus = useUpdateEventStatus()
  const syncRates = useSyncEventRates()

  const handleSyncRates = async () => {
    try {
      await syncRates.mutateAsync(eventId)
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

  const handleEditDeposit = (depositId: string) => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "event-entry", eventId, depositId } })
    )
  }

  const handleGenerateReport = () => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "vendor-report", eventId } })
    )
  }

  if (eventLoading || !event) {
    return <EventDetailsPageSkeleton />
  }

  const depositsWithDetails = deposits.map(dd => ({
    ...dd,
    itemCount: (dd as any).itemCount || 0
  })) as DepositWithDetails[]

  const totalPayout = depositsWithDetails.reduce((sum, d) => sum + d.total_payout, 0)

  const columns: ColumnDef<DepositWithDetails>[] = [
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
  ]

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
            <>
              <Button
                onClick={() => setShowRatesEditor(true)}
                variant="outline"
              >
                <DollarSign className="size-4" />
                Nilai Tukar Aktif
              </Button>
              <Button
                onClick={handleSyncRates}
                disabled={syncRates.isPending}
                variant="outline"
              >
                <RefreshCw className={syncRates.isPending ? "animate-spin" : ""} />
                {syncRates.isPending ? "Sinkronisasi..." : "Sinkronisasi Harga Dasar"}
              </Button>
              <Button onClick={handleAddDeposit}>
                <Plus />
                Tambah Setoran
              </Button>
            </>
          ) : (
            <Button onClick={handleGenerateReport}>
              <FileText className="size-4" />
              Laporan Vendor
            </Button>
          )}
        </div>
      </header>

      {showRatesEditor && (
        <div className="mb-6">
          <DailyRatesEditor
            eventId={eventId}
            onClose={() => setShowRatesEditor(false)}
          />
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
            <DataTable columns={columns} data={depositsWithDetails} />
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
