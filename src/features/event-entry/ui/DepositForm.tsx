import { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import { Scale, Receipt, User, UserPlus, Search, Check, Keyboard } from "lucide-react"
import { useEventRates } from "@/entities/event/api/hooks"
import { useMembers, useCreateMember } from "@/entities/member/api/hooks"
import { useDeposit, useCreateDeposit, useUpdateDeposit } from "@/entities/deposit/api/hooks"
import type { EventRate } from "@/entities/event/model/types"
import type { Member } from "@/entities/member/model/types"
import { formatCurrency } from "@/shared/lib/format"
import { getDb } from "@/shared/api"
import { Button } from "@/shared/ui/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { Badge } from "@/shared/ui/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/ui/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/ui/popover"
import { cn } from "@/shared/lib/utils"
import { ExpressionInput } from "@/shared/ui/expression-input"

interface Props {
  eventId: string
  depositId?: string | null
  onSuccess?: () => void
}

export interface DepositFormRef {
  focusCategory: (categoryId: string) => void
  handleSubmit: () => Promise<void>
  hasSelectedMember: () => boolean
}

interface RateWithDetails extends EventRate {
  name: string
  unit: string
  is_active: number
}

export const DepositForm = forwardRef<DepositFormRef, Props>(({ eventId, depositId, onSuccess }, ref) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [rates, setRates] = useState<RateWithDetails[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const categoryInputRefs = useRef<Record<string, HTMLInputElement | null >>({})
  const currentIndexRef = useRef(0)
  const isEditMode = !!depositId

  const { data: membersData = [] } = useMembers()
  const { data: ratesData = [], isLoading: ratesLoading } = useEventRates(eventId)
  const { data: existingDeposit } = useDeposit(depositId || "")
  const createDeposit = useCreateDeposit()
  const updateDeposit = useUpdateDeposit()
  const createMember = useCreateMember()

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    focusCategory: (categoryId: string) => {
      const el = categoryInputRefs.current[categoryId]
      if (el) {
        el.focus()
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    },
    handleSubmit,
    hasSelectedMember: () => !!selectedMember,
  }))

  useEffect(() => {
    async function loadRates() {
      if (!ratesData.length) return
      const db = await getDb()
      const cats = await db.select<{ id: string; name: string; unit: string }[]>(
        "SELECT id, name, unit FROM category"
      )

      const ratesWithNames: RateWithDetails[] = ratesData
        .map((r) => {
          const cat = cats.find((c) => c.id === r.category_id)
          return {
            ...r,
            name: cat?.name || "Unknown",
            unit: cat?.unit || "kg",
            is_active: (r as any).is_active ?? 1,
          }
        })
        .filter((r) => r.is_active === 1)

      setRates(ratesWithNames)
    }
    loadRates()
  }, [ratesData])

  useEffect(() => {
    if (isEditMode && existingDeposit && membersData.length > 0) {
      const member = membersData.find((mem) => mem.id === existingDeposit.member_id)
      if (member) {
        setSelectedMember(member)
        setSearchQuery(member.name)
      }
      const weightMap: Record<string, number> = {}
      existingDeposit.items.forEach((item) => {
        weightMap[item.category_id] = item.weight
      })
      setWeights(weightMap)
    }
  }, [isEditMode, existingDeposit, membersData])

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return membersData.slice(0, 7)
    const q = searchQuery.toLowerCase()
    return membersData
      .filter((m) => m.name.toLowerCase().includes(q) || String(m.id).includes(q))
      .slice(0, 7)
  }, [membersData, searchQuery])

  const activeWeights = useMemo(() => {
    return rates
      .map((rate) => {
        const weight = weights[rate.category_id] || 0
        return { ...rate, weight, subtotal: rate.active_rate * weight }
      })
      .filter((r) => r.weight > 0)
  }, [weights, rates])

  const currentTotal = useMemo(() => activeWeights.reduce((s, r) => s + r.subtotal, 0), [activeWeights])

  const handleWeightChange = (catId: string, value: string) => {
    const num = parseFloat(value)
    setWeights((prev) => ({ ...prev, [catId]: isNaN(num) ? 0 : num }))
  }

  const handleArrowNavigation = (currentIndex: number, direction: 'up' | 'down' | 'left' | 'right') => {
    const cols = 2 // 2-column grid
    const total = rates.length
    let newIndex = currentIndex

    switch (direction) {
      case 'right':
        newIndex = currentIndex + 1
        break
      case 'left':
        newIndex = currentIndex - 1
        break
      case 'down':
        newIndex = currentIndex + cols
        break
      case 'up':
        newIndex = currentIndex - cols
        break
    }

    // Wrap around or clamp to valid range
    if (newIndex < 0) newIndex = total - 1
    if (newIndex >= total) newIndex = 0

    currentIndexRef.current = newIndex
    const nextCategoryId = rates[newIndex]?.category_id
    if (nextCategoryId) {
      categoryInputRefs.current[nextCategoryId]?.focus()
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!selectedMember || currentTotal <= 0) return

    const itemsToSave = Object.entries(weights)
      .filter(([, weight]) => weight > 0)
      .map(([categoryId, weight]) => ({ categoryId, weight }))

    if (itemsToSave.length === 0) return

    try {
      if (isEditMode && depositId) {
        await updateDeposit.mutateAsync({ depositId, eventId, memberId: selectedMember.id, totalPayout: currentTotal, items: itemsToSave })
      } else {
        await createDeposit.mutateAsync({ eventId, memberId: selectedMember.id, totalPayout: currentTotal, items: itemsToSave })
      }
      onSuccess?.()
    } catch (err) {
      console.error(err)
    }
  }, [selectedMember, currentTotal, weights, isEditMode, depositId, eventId, updateDeposit, createDeposit, onSuccess, rates])

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    focusCategory: (categoryId: string) => {
      // Defer focus to avoid dialog stealing focus during close animation
      requestAnimationFrame(() => {
        const el = categoryInputRefs.current[categoryId]
        if (el) {
          el.focus()
          el.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      })
    },
    handleSubmit,
    hasSelectedMember: () => selectedMember !== null,
  }), [handleSubmit, selectedMember])

  if (ratesLoading) return null

  return (
    <div className="grid grid-cols-[1fr_360px] gap-8 items-stretch">
      {/* ── Left: Form ── */}
      <div className="flex flex-col gap-10">
        {/* Identitas */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
            <User className="size-3.5" /> Identitas Penyetor
          </h2>

          {!selectedMember ? (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-11 justify-start font-normal text-muted-foreground rounded-xl px-4"
                  data-icon="inline-start"
                >
                  <Search />
                  {searchQuery || "Cari ID atau nama penyetor…"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[380px] p-0 rounded-xl" align="start">
                <Command>
                  <CommandInput placeholder="Cari anggota…" value={searchQuery} onValueChange={setSearchQuery} />
                  <CommandList>
                    <CommandGroup heading="Anggota">
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
                            <span className="text-xs text-muted-foreground/60 font-mono">{m.id}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {searchQuery && filteredMembers.length === 0 && (
                      <>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            value={`__create__ ${searchQuery}`}
                            onSelect={async () => {
                              try {
                                const newMember = await createMember.mutateAsync({ name: searchQuery.trim() })
                                setSelectedMember(newMember)
                                setSearchQuery("")
                                setPopoverOpen(false)
                              } catch {
                                /* noop */
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 text-primary">
                              <UserPlus className="size-4" />
                              <span>
                                Buat anggota baru:{" "}
                                <span className="font-medium">&ldquo;{searchQuery}&rdquo;</span>
                              </span>
                            </div>
                          </CommandItem>
                        </CommandGroup>
                      </>
                    )}
                    <CommandEmpty>Tidak ada anggota ditemukan.</CommandEmpty>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/30 transition-colors">
              <div className="flex items-center justify-center size-11 rounded-full bg-primary/10 text-primary shrink-0">
                <User className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{selectedMember.name}</p>
                <p className="text-xs text-muted-foreground/60 font-mono">ID {selectedMember.id}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)} className="shrink-0 text-xs">
                Ubah
              </Button>
            </div>
          )}
        </section>

        {/* Timbangan */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
              <Scale className="size-3.5" /> Data Timbangan
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground/60 gap-1 px-2 py-0.5 rounded-md">
              <Keyboard className="size-3" />
              Gunakan ← ↑ ↓ → atau Ctrl + Shift + F untuk navigasi
            </Badge>
          </div>

          {rates.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground text-center border border-dashed border-border rounded-xl">
              Belum ada sinkronisasi harga kategori.
            </div>
          ) : (
            <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(90vh - 16rem)", scrollbarGutter: "stable" }}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 pb-4">
                {rates.map((rate, idx) => {
                  const filled = (weights[rate.category_id] || 0) > 0
                  const isLast = idx === rates.length - 1
                  const nextCategoryId = rates[idx + 1]?.category_id
                  return (
                    <div key={rate.category_id} className="group">
                      <label className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{rate.name}</span>
                        <Badge variant="outline" className="text-[11px] font-mono tabular-nums px-2 py-0 rounded-md">
                          {formatCurrency(rate.active_rate)}/{rate.unit}
                        </Badge>
                      </label>
                      <div className="relative">
                        <ExpressionInput
                          inputRef={(el) => { categoryInputRefs.current[rate.category_id] = el }}
                          value={weights[rate.category_id] || ""}
                          onChange={(val) => handleWeightChange(rate.category_id, val)}
                          onNext={
                            isLast
                              ? () => handleSubmit()
                              : nextCategoryId
                                ? () => categoryInputRefs.current[nextCategoryId]?.focus()
                                : undefined
                          }
                          placeholder={rate.unit === "pc" ? "0" : "0.0"}
                          step={rate.unit === "pc" ? "1" : "0.01"}
                          className={cn(
                            "h-11 pr-10 tabular-nums font-medium rounded-lg transition-all",
                            filled && "ring-2 ring-primary/20 border-primary/30"
                          )}
                          disabled={!selectedMember}
                          onArrowKey={(direction) => handleArrowNavigation(idx, direction)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xs font-semibold uppercase tracking-wider pointer-events-none">
                          {rate.unit}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Right: Receipt ── */}
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm h-[95%] ">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <Receipt className="size-4 text-muted-foreground/50" />
            Kalkulasi
          </CardTitle>
          <CardDescription className="text-xs">Ringkasan pembayaran real-time.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {activeWeights.length > 0 ? (
            <div className="overflow-y-auto pr-2 flex-1 min-h-0" style={{ scrollbarGutter: "stable" }}>
              <div className="flex flex-col gap-1 pb-2">
                {activeWeights.map((r) => (
                  <div
                    key={r.category_id}
                    className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-b-0 animate-in fade-in duration-300"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground/60 tabular-nums font-mono mt-0.5">
                        {r.weight.toLocaleString("id-ID", {
                          minimumFractionDigits: r.unit === "pc" ? 0 : 2,
                          maximumFractionDigits: r.unit === "pc" ? 0 : 2,
                        })}{" "}
                        <span className="text-muted-foreground/35">{r.unit}</span>
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(r.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-muted-foreground/35 text-xs text-center">
              <Scale className="size-8 mx-auto mb-2" />
              <p>Masukkan berat untuk<br />melihat kalkulasi</p>
            </div>
          )}

          <div className="mt-auto pt-5">
            <Separator className="mb-5" />

            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">
                  Total Pembayaran
                </p>
                <p
                  className={cn(
                    "text-3xl font-semibold tracking-tight tabular-nums transition-all duration-300",
                    currentTotal > 0 ? "text-foreground scale-100" : "text-muted-foreground/20 scale-[0.98]"
                  )}
                >
                  {formatCurrency(currentTotal)}
                </p>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!selectedMember || currentTotal <= 0 || createDeposit.isPending || updateDeposit.isPending}
              size="lg"
              className="w-full h-12 rounded-xl font-semibold text-base"
              data-icon="inline-start"
            >
              {createDeposit.isPending || updateDeposit.isPending ? (
                "Menyimpan…"
              ) : (
                <>
                  <Check />
                  {isEditMode ? "Perbarui Setoran" : "Catat Setoran"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

DepositForm.displayName = "DepositForm"
