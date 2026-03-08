import { useState, useEffect } from "react"
import { ArrowLeft, RefreshCw, Plus, FileText, CheckCircle2 } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  getEvent,
  updateEventStatus,
  syncEventRates,
} from "@/entities/event/api/queries"
import { listDeposits } from "@/entities/deposit/api/queries"
import type { Event } from "@/entities/event/model/types"
import type { Deposit } from "@/entities/deposit/model/types"
import { formatCurrency } from "@/shared/lib/format"
import { DataTable } from "@/shared/ui/DataTable"
import { Button } from "@/shared/ui/ui/button"
import { Card, CardContent } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { Badge } from "@/shared/ui/ui/badge"

interface Props {
  eventId: string
}

export function EventDetailsPage({ eventId }: Props) {
  const [event, setEvent] = useState<Event | null>(null)
  const [deposits, setDeposits] = useState<(Deposit & { memberName: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [e, d] = await Promise.all([
        getEvent(eventId),
        listDeposits(eventId),
      ])
      setEvent(e)
      setDeposits(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [eventId])

  const handleSyncRates = async () => {
    try {
      setSyncing(true)
      await syncEventRates(eventId)
      await fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!event) return
    const newStatus = event.status === "active" ? "finished" : "active"
    try {
      await updateEventStatus(eventId, newStatus)
      setEvent({ ...event, status: newStatus })
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
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "event-entry", eventId } })
    )
  }

  const handleGenerateReport = () => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "vendor-report", eventId } })
    )
  }

  if (loading || !event)
    return <div className="p-12 animate-pulse">Memuat sesi...</div>

  const totalPayout = deposits.reduce((sum, d) => sum + d.total_payout, 0)

  type DepositWithName = Deposit & { memberName: string }

  const columns: ColumnDef<DepositWithName>[] = [
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
      accessorKey: "total_payout",
      header: "Total Pembayaran",
      cell: ({ row }) => formatCurrency(row.original.total_payout),
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
                onClick={handleSyncRates}
                disabled={syncing}
                variant="outline"
              >
                <RefreshCw className={syncing ? "animate-spin" : ""} />
                {syncing ? "Sinkronisasi..." : "Sinkronisasi Harga Dasar"}
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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Buku Besar Setoran</h2>
            <span className="text-sm font-medium text-[#1A1A1A]/50">
              {deposits.length} transaksi
            </span>
          </div>

          <DataTable columns={columns} data={deposits} />
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
                  perubahan harga di masa depan. Gunakan tombol Sinkronisasi jika
                  Anda baru saja mengubah harga di Skema Kategori.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
