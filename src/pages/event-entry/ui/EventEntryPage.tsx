import { useState, useEffect, useMemo } from "react"
import { ArrowLeft, Search, Check, Calculator } from "lucide-react"
import { useEventRates } from "@/entities/event/api/hooks"
import { useMembers } from "@/entities/member/api/hooks"
import { useDeposit, useCreateDeposit, useUpdateDeposit } from "@/entities/deposit/api/hooks"
import type { EventRate } from "@/entities/event/model/types"
import type { Member } from "@/entities/member/model/types"
import { formatCurrency } from "@/shared/lib/format"
import { getDb } from "@/shared/api"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/ui/popover"

interface Props {
  eventId: string
  depositId?: string | null
}

interface RateWithDetails extends EventRate {
  name: string
  unit: string
  is_active: number
}

function EventEntryPageSkeleton() {
  return (
    <div className="p-12 max-w-4xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-center gap-6 border-b border-[#1A1A1A]/10 pb-6">
        <Skeleton className="size-10 rounded-md" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </header>

      <div className="grid grid-cols-5 gap-12">
        <div className="col-span-3 flex flex-col gap-12">
          <section className="flex flex-col gap-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
          </section>

          <section className="flex flex-col gap-6">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="col-span-2">
          <Card className="sticky top-12 h-[400px] flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="size-5" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-6 pt-0 mt-auto">
              <Separator className="mb-6" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-32 mt-2" />
              <Skeleton className="h-10 w-full mt-8" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function EventEntryPage({ eventId, depositId }: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [rates, setRates] = useState<RateWithDetails[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const isEditMode = !!depositId

  const { data: membersData = [] } = useMembers()
  const { data: ratesData = [], isLoading: ratesLoading } = useEventRates(eventId)
  const { data: existingDeposit } = useDeposit(depositId || "")
  const createDeposit = useCreateDeposit()
  const updateDeposit = useUpdateDeposit()

  useEffect(() => {
    async function loadRates() {
      if (!ratesData.length) return
      const db = await getDb()
      const cats = await db.select<{ id: string; name: string; unit: string }[]>(
        "SELECT id, name, unit FROM category"
      )

      const ratesWithNames: RateWithDetails[] = ratesData.map((r) => {
        const cat = cats.find((c) => c.id === r.category_id)
        return { 
          ...r, 
          name: cat?.name || "Unknown", 
          unit: cat?.unit || "kg",
          is_active: (r as any).is_active ?? 1
        }
      }).filter(r => r.is_active === 1)

      setRates(ratesWithNames)
    }
    loadRates()
  }, [ratesData])

  useEffect(() => {
    if (isEditMode && existingDeposit && membersData.length > 0) {
      const member = membersData.find(mem => mem.id === existingDeposit.member_id)
      if (member) {
        setSelectedMember(member)
        setSearchQuery(member.name)
      }
      const weightMap: Record<string, number> = {}
      existingDeposit.items.forEach(item => {
        weightMap[item.category_id] = item.weight
      })
      setWeights(weightMap)
    }
  }, [isEditMode, existingDeposit, membersData])

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return membersData.slice(0, 5)
    const q = searchQuery.toLowerCase()
    return membersData
      .filter(
        (m) =>
          m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      )
      .slice(0, 5)
  }, [membersData, searchQuery])

  const currentTotal = useMemo(() => {
    let total = 0
    Object.entries(weights).forEach(([catId, weight]) => {
      const rate = rates.find((r) => r.category_id === catId)
      if (rate && weight > 0) {
        total += rate.active_rate * weight
      }
    })
    return total
  }, [weights, rates])

  const handleWeightChange = (catId: string, value: string) => {
    const num = parseFloat(value)
    setWeights((prev) => ({
      ...prev,
      [catId]: isNaN(num) ? 0 : num,
    }))
  }

  const handleSubmit = async () => {
    if (!selectedMember || currentTotal <= 0) return

    const itemsToSave = Object.entries(weights)
      .filter(([_, weight]) => weight > 0)
      .map(([categoryId, weight]) => ({ categoryId, weight }))

    if (itemsToSave.length === 0) return

    try {
      if (isEditMode && depositId) {
        await updateDeposit.mutateAsync({
          depositId,
          eventId,
          memberId: selectedMember.id,
          totalPayout: currentTotal,
          items: itemsToSave
        })
      } else {
        await createDeposit.mutateAsync({
          eventId,
          memberId: selectedMember.id,
          totalPayout: currentTotal,
          items: itemsToSave
        })
      }
      window.dispatchEvent(
        new CustomEvent("navigate", {
          detail: { view: "event-details", eventId },
        })
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleBack = () => {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { view: "event-details", eventId } })
    )
  }

  if (ratesLoading) {
    return <EventEntryPageSkeleton />
  }

  return (
    <div className="p-12 max-w-4xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-center gap-6 border-b border-[#1A1A1A]/10 pb-6">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="page-title text-[#1A1A1A]">
            {isEditMode ? "Perbarui" : "Terminal"} <span className="text-[#1A1A1A]/40">Setoran</span>
          </h1>
          <p className="mt-2 text-[#1A1A1A]/50 text-sm">
            {isEditMode 
              ? "Perbarui data timbangan dan kalkulasi." 
              : "Pencatatan data timbangan dan kalkulasi otomatis."}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-12">
        <div className="col-span-3 flex flex-col gap-12">
          <section className="flex flex-col gap-6 relative">
            <h2 className="section-header">Identitas Penyetor</h2>

            {!selectedMember ? (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="justify-start font-normal"
                  >
                    <Search className="size-4 mr-2 opacity-50" />
                    {searchQuery || "Cari berdasarkan ID atau Nama..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Cari anggota..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Tidak ada anggota ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {filteredMembers.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={`${m.id} ${m.name}`}
                            onSelect={() => {
                              setSelectedMember(m)
                              setSearchQuery("")
                              setPopoverOpen(false)
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium">{m.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {m.id}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex items-center justify-between p-4 bg-[#1A1A1A]/5 rounded-xl border border-[#1A1A1A]/10">
                <div>
                  <p className="font-medium text-[#1A1A1A]">
                    {selectedMember.name}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/50 font-mono mt-1">
                    ID: {selectedMember.id}
                  </p>
                </div>
                <Button
                  variant="link"
                  onClick={() => setSelectedMember(null)}
                  className="text-xs"
                >
                  Ubah Anggota
                </Button>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            <h2 className="section-header">Data Timbangan</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {rates.length === 0 ? (
                <div className="col-span-2 py-4 text-sm text-[#1A1A1A]/40">
                  Belum ada sinkronisasi harga kategori.
                </div>
              ) : (
                rates.map((rate) => (
                  <div key={rate.category_id} className="relative group">
                    <label className="micro-label text-[#1A1A1A]/50 mb-1 flex justify-between items-center">
                      <span>{rate.name}</span>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        @ {formatCurrency(rate.active_rate)}/{rate.unit}
                      </span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step={rate.unit === "pc" ? "1" : "0.01"}
                        placeholder={rate.unit === "pc" ? "0" : "0.0"}
                        className="pr-8 tabular-nums font-medium bg-white"
                        value={weights[rate.category_id] || ""}
                        onChange={(e) =>
                          handleWeightChange(rate.category_id, e.target.value)
                        }
                        disabled={!selectedMember}
                      />
                      <span className="absolute right-0 top-3 text-[#1A1A1A]/30 text-sm pointer-events-none uppercase tracking-widest">
                        {rate.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="col-span-2">
          <Card className="sticky top-12 h-[400px] flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calculator className="size-5 text-[#1A1A1A]/40" />
                <CardTitle className="section-header">Kalkulasi</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4">
              {Object.entries(weights).map(([catId, weight]) => {
                const rate = rates.find((r) => r.category_id === catId)
                if (!rate || weight <= 0) return null
                const subtotal = rate.active_rate * weight

                return (
                  <div
                    key={catId}
                    className="flex justify-between items-baseline text-sm animate-in fade-in zoom-in-95"
                  >
                    <span className="text-[#1A1A1A]/60">{rate.name}</span>
                    <div className="flex gap-4">
                      <span className="tabular-nums text-[#1A1A1A]/40">
                        {weight} {rate.unit}
                      </span>
                      <span className="tabular-nums font-medium w-24 text-right truncate">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
            <div className="p-6 pt-0 mt-auto">
              <Separator className="mb-6" />
              <p className="micro-label text-[#1A1A1A]/50 mb-2">
                Total Pembayaran
              </p>
              <p className="text-3xl font-medium tracking-tight tabular-nums transition-all">
                {formatCurrency(currentTotal)}
              </p>

              <Button
                onClick={handleSubmit}
                disabled={!selectedMember || currentTotal <= 0 || createDeposit.isPending || updateDeposit.isPending}
                className="w-full mt-8"
              >
                {createDeposit.isPending || updateDeposit.isPending ? (
                  "Menyimpan..."
                ) : (
                  <>
                    <Check className="size-4" />
                    {isEditMode ? "Perbarui Setoran" : "Catat Setoran"}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
