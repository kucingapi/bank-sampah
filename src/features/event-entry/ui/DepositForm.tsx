import { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import { Scale, Receipt, User, UserPlus, Search, Check, Keyboard, Truck, Plus, Trash2 } from "lucide-react"
import { useEventRates } from "@/entities/event/api/hooks"
import { useMembers, useCreateMember } from "@/entities/member/api/hooks"
import { useDeposit, useCreateDeposit, useUpdateDeposit } from "@/entities/deposit/api/hooks"
import { useVendors, useCreateVendor } from "@/entities/vendor/api/hooks"
import { getOrCreateDefaultVendors } from "@/entities/vendor/api/queries"
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
  focusRow: (rowId: string) => void
  getRows: () => DepositRow[]
  handleSubmit: () => Promise<void>
  hasSelectedMember: () => boolean
}

interface RateWithDetails extends EventRate {
  name: string
  unit: string
  is_active: number
}

interface DepositRow {
  id: string
  categoryId: string
  weight: number
  vendorId: number | null
}

export type { DepositRow }

let rowIdCounter = 0
function makeRowId(): string {
  rowIdCounter += 1
  return `row-${Date.now().toString(36)}-${rowIdCounter}`
}

export const DepositForm = forwardRef<DepositFormRef, Props>(({ eventId, depositId, onSuccess }, ref) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [rows, setRows] = useState<DepositRow[]>([])
  const [rates, setRates] = useState<RateWithDetails[]>([])
  const [rowVendorSearch, setRowVendorSearch] = useState<Record<string, string>>({})
  const [rowVendorOpen, setRowVendorOpen] = useState<string | null>(null)
  const [defaultVendorId, setDefaultVendorId] = useState<number | null>(null)
  const categoryInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const vendorButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const plusButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const deleteButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const isEditMode = !!depositId

  const { data: membersData = [] } = useMembers()
  const { data: vendorsData = [] } = useVendors()
  const { data: ratesData = [], isLoading: ratesLoading } = useEventRates(eventId)
  const { data: existingDeposit } = useDeposit(depositId || "")
  const createDeposit = useCreateDeposit()
  const updateDeposit = useUpdateDeposit()
  const createMember = useCreateMember()
  const createVendor = useCreateVendor()

  useEffect(() => {
    async function loadRates() {
      if (!ratesData.length) return
      const db = await getDb()
      const cats = await db.select<{ id: string; name: string; unit: string; default_vendor_id: number | null }[]>(
        "SELECT id, name, unit, default_vendor_id FROM category ORDER BY sort_order ASC, name ASC"
      )

      const ratesWithNames: RateWithDetails[] = ratesData
        .map((r) => {
          const cat = cats.find((c) => c.id === r.category_id)
          const raw = r as EventRate & { is_active?: number }
          return {
            ...r,
            name: cat?.name || "Unknown",
            unit: cat?.unit || "kg",
            is_active: raw.is_active ?? 1,
          }
        })
        .filter((r) => r.is_active === 1)

      setRates(ratesWithNames)
    }
    loadRates()
  }, [ratesData])

  useEffect(() => {
    async function initDefaults() {
      const defaults = await getOrCreateDefaultVendors()
      setDefaultVendorId(defaults.lainnya.id)
    }
    initDefaults()
  }, [])

  useEffect(() => {
    if (!defaultVendorId) return
    if (isEditMode) return
    if (rows.length > 0) return
    if (rates.length === 0) return
    setRows(rates.map((r) => ({
      id: makeRowId(),
      categoryId: r.category_id,
      weight: 0,
      vendorId: defaultVendorId,
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVendorId, isEditMode, rates])

  useEffect(() => {
    if (isEditMode && existingDeposit && membersData.length > 0 && defaultVendorId !== null) {
      const member = membersData.find((mem) => mem.id === existingDeposit.member_id)
      if (member) {
        setSelectedMember(member)
        setSearchQuery(member.name)
      }
      if (existingDeposit.items.length > 0) {
        setRows(existingDeposit.items.map((it) => ({
          id: makeRowId(),
          categoryId: it.category_id,
          weight: it.weight,
          vendorId: it.vendor_id ?? defaultVendorId,
        })))
      }
    }
  }, [isEditMode, existingDeposit, membersData, defaultVendorId])

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return membersData
    const q = searchQuery.toLowerCase()
    return membersData.filter((m) => m.name.toLowerCase().includes(q) || String(m.id).includes(q))
  }, [membersData, searchQuery])

  const rateByCategory = useMemo(() => {
    const map: Record<string, RateWithDetails> = {}
    rates.forEach((r) => { map[r.category_id] = r })
    return map
  }, [rates])

  const activeRows = useMemo(() => {
    return rows
      .map((row) => {
        const rate = rateByCategory[row.categoryId]
        if (!rate) return null
        if (row.weight <= 0) return null
        return {
          ...row,
          name: rate.name,
          unit: rate.unit,
          active_rate: rate.active_rate,
          subtotal: rate.active_rate * row.weight,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  }, [rows, rateByCategory])

  const currentTotal = useMemo(
    () => activeRows.reduce((s, r) => s + r.subtotal, 0),
    [activeRows]
  )

  const updateRow = (id: string, patch: Partial<DepositRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const removeRow = (id: string) => {
    const target = rows.find((r) => r.id === id)
    if (!target) return
    const sameCategoryCount = rows.filter((r) => r.categoryId === target.categoryId).length
    if (sameCategoryCount <= 1) return
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const splitRow = (id: string) => {
    const target = rows.find((r) => r.id === id)
    if (!target) return
    const others = vendorsData.filter((v) => v.id !== target.vendorId)
    const nextVendor = others[0] ?? vendorsData[0]
    const newRow: DepositRow = {
      id: makeRowId(),
      categoryId: target.categoryId,
      weight: 0,
      vendorId: nextVendor?.id ?? target.vendorId,
    }
    const idx = rows.findIndex((r) => r.id === id)
    const next = [...rows]
    next.splice(idx + 1, 0, newRow)
    setRows(next)
  }

  const setRowVendor = (id: string, vendorId: number) => {
    const target = rows.find((r) => r.id === id)
    if (!target) return
    const collision = rows.find(
      (r) => r.id !== id && r.categoryId === target.categoryId && r.vendorId === vendorId
    )
    if (collision) {
      setRows((prev) => {
        const merged = prev.map((r) => {
          if (r.id === collision.id) return { ...r, weight: parseFloat((r.weight + target.weight).toFixed(2)) }
          if (r.id === id) return null
          return r
        }).filter((r): r is DepositRow => r !== null)
        return merged
      })
    } else {
      updateRow(id, { vendorId })
    }
    setRowVendorOpen(null)
    setRowVendorSearch((s) => ({ ...s, [id]: "" }))
  }

  const focusRowWeight = useCallback((rowId: string) => {
    const el = categoryInputRefs.current[rowId]
    if (el) {
      el.focus()
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [])

  const handleRowArrow = useCallback(
    (
      rowId: string,
      position: "weight" | "vendor" | "plus" | "delete",
      hasDelete: boolean,
      direction: "up" | "down" | "left" | "right"
    ) => {
      const idx = rows.findIndex((r) => r.id === rowId)
      if (idx === -1) return
      const isFirst = idx === 0
      const isLast = idx === rows.length - 1

      if (direction === "up" && !isFirst) {
        focusRowWeight(rows[idx - 1].id)
      } else if (direction === "down" && !isLast) {
        focusRowWeight(rows[idx + 1].id)
      } else if (direction === "right") {
        if (position === "weight") {
          vendorButtonRefs.current[rowId]?.focus()
        } else if (position === "vendor") {
          plusButtonRefs.current[rowId]?.focus()
        } else if (position === "plus") {
          if (hasDelete) {
            deleteButtonRefs.current[rowId]?.focus()
          } else if (!isLast) {
            focusRowWeight(rows[idx + 1].id)
          }
        } else if (position === "delete") {
          if (!isLast) focusRowWeight(rows[idx + 1].id)
        }
      } else if (direction === "left") {
        if (position === "vendor") {
          focusRowWeight(rowId)
        } else if (position === "plus") {
          vendorButtonRefs.current[rowId]?.focus()
        } else if (position === "delete") {
          plusButtonRefs.current[rowId]?.focus()
        }
      }
    },
    [rows, focusRowWeight]
  )

  const buildButtonArrowHandler = useCallback(
    (
      rowId: string,
      position: "vendor" | "plus" | "delete",
      hasDelete: boolean
    ) => (e: React.KeyboardEvent) => {
      const keyMap: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      }
      const direction = keyMap[e.key]
      if (!direction) return
      e.preventDefault()
      handleRowArrow(rowId, position, hasDelete, direction)
    },
    [handleRowArrow]
  )

  const handleSubmit = useCallback(async () => {
    if (!selectedMember || currentTotal <= 0) return

    const itemsToSave = activeRows.map((r) => ({
      categoryId: r.categoryId,
      weight: r.weight,
      vendorId: r.vendorId as number,
    }))

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
  }, [selectedMember, currentTotal, activeRows, isEditMode, depositId, eventId, updateDeposit, createDeposit, onSuccess])

  useImperativeHandle(ref, () => ({
    focusRow: (rowId: string) => {
      requestAnimationFrame(() => {
        const el = categoryInputRefs.current[rowId]
        if (el) {
          el.focus()
          el.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      })
    },
    getRows: () => rows,
    handleSubmit,
    hasSelectedMember: () => selectedMember !== null,
  }), [rows, handleSubmit, selectedMember])

  const groupedByVendor = useMemo(() => {
    const map = new Map<number, { vendorName: string; lines: typeof activeRows; subtotal: number }>()
    for (const r of activeRows) {
      const vid = r.vendorId ?? -1
      const vname = vendorsData.find((v) => v.id === vid)?.name ?? "—"
      const existing = map.get(vid)
      if (existing) {
        existing.lines.push(r)
        existing.subtotal += r.subtotal
      } else {
        map.set(vid, { vendorName: vname, lines: [r], subtotal: r.subtotal })
      }
    }
    return Array.from(map.entries())
  }, [activeRows, vendorsData])

  if (ratesLoading || defaultVendorId === null) return null

  return (
    <div className="grid grid-cols-[1fr_360px] gap-8" style={{ height: "calc(90vh - 12rem)", maxHeight: "calc(90vh - 12rem)", overflow: "hidden" }}>
      <div className="flex flex-col gap-8 overflow-hidden">
        <section className="flex flex-col gap-4 shrink-0">
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
                          <div className="flex items-center gap-3 w-full">
                            <span className="text-xs text-muted-foreground/60 font-mono shrink-0">{m.id}</span>
                            <span className="font-medium">{m.name}</span>
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

        <section className="flex flex-col gap-5 min-h-0 flex-1">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
              <Scale className="size-3.5" /> Data Timbangan
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground/60 gap-1 px-2 py-0.5 rounded-md">
              <Keyboard className="size-3" />
              Pilih vendor per baris; tambahkan baris untuk memecah kategori
            </Badge>
          </div>

          {rates.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground text-center border border-dashed border-border rounded-xl">
              Belum ada sinkronisasi harga kategori.
            </div>
          ) : (
            <div className="overflow-y-auto pr-2" style={{ scrollbarGutter: "stable" }}>
              <div className="flex flex-col gap-3 pb-4">
                {rows.map((row, idx) => {
                  const rate = rateByCategory[row.categoryId]
                  if (!rate) return null
                  const filled = row.weight > 0
                  const sameCategoryCount = rows.filter((r) => r.categoryId === row.categoryId).length
                  const hasDelete = sameCategoryCount > 1
                  const vendorName = vendorsData.find((v) => v.id === row.vendorId)?.name ?? "Pilih vendor…"
                  const onWeightArrow = (direction: "up" | "down" | "left" | "right") =>
                    handleRowArrow(row.id, "weight", hasDelete, direction)
                  const onVendorArrow = buildButtonArrowHandler(row.id, "vendor", hasDelete)
                  const onPlusArrow = buildButtonArrowHandler(row.id, "plus", hasDelete)
                  const onDeleteArrow = buildButtonArrowHandler(row.id, "delete", hasDelete)
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "rounded-xl border border-border/60 bg-card/40 p-3 transition-all",
                        filled && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate">{rate.name}</span>
                          <Badge variant="outline" className="text-[11px] font-mono tabular-nums px-2 py-0 rounded-md shrink-0">
                            {formatCurrency(rate.active_rate)}/{rate.unit}
                          </Badge>
                          {sameCategoryCount > 1 && (
                            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground/70 px-1.5 py-0 rounded-md shrink-0">
                              pecahan {idx + 1}/{sameCategoryCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            ref={(el) => { plusButtonRefs.current[row.id] = el }}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => splitRow(row.id)}
                            onKeyDown={onPlusArrow}
                            title="Tambah pecahan kategori yang sama untuk vendor lain"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                          {sameCategoryCount > 1 && (
                            <Button
                              ref={(el) => { deleteButtonRefs.current[row.id] = el }}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(row.id)}
                              onKeyDown={onDeleteArrow}
                              title="Hapus pecahan"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <ExpressionInput
                            inputRef={(el) => { categoryInputRefs.current[`${row.id}`] = el }}
                            value={row.weight || ""}
                            onChange={(val) => {
                              const num = parseFloat(val)
                              updateRow(row.id, { weight: isNaN(num) ? 0 : parseFloat(num.toFixed(2)) })
                            }}
                            onArrowKey={onWeightArrow}
                            onNext={() => {
                              const nextRow = rows[idx + 1]
                              if (nextRow) {
                                focusRowWeight(nextRow.id)
                              } else {
                                handleSubmit()
                              }
                            }}
                            placeholder={rate.unit === "pc" ? "0" : "0.0"}
                            step={rate.unit === "pc" ? "1" : "0.01"}
                            className={cn(
                              "h-10 pr-10 tabular-nums font-medium rounded-lg transition-all"
                            )}
                            disabled={!selectedMember}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xs font-semibold uppercase tracking-wider pointer-events-none">
                            {rate.unit}
                          </span>
                        </div>

                        <Popover
                          open={rowVendorOpen === row.id}
                          onOpenChange={(open) => {
                            setRowVendorOpen(open ? row.id : null)
                            if (!open) setRowVendorSearch((s) => ({ ...s, [row.id]: "" }))
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              ref={(el) => { vendorButtonRefs.current[row.id] = el }}
                              variant="outline"
                              role="combobox"
                              className="h-10 justify-start font-normal text-xs rounded-lg px-3 w-[170px]"
                              data-icon="inline-start"
                              disabled={!selectedMember}
                              onKeyDown={onVendorArrow}
                            >
                              <Truck className="size-3.5" />
                              <span className="truncate">{vendorName}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0 rounded-xl" align="end">
                            <Command>
                              <CommandInput
                                placeholder="Cari vendor…"
                                value={rowVendorSearch[row.id] ?? ""}
                                onValueChange={(v) => setRowVendorSearch((s) => ({ ...s, [row.id]: v }))}
                              />
                              <CommandList>
                                <CommandGroup heading="Vendor">
                                  {vendorsData
                                    .filter((v) => !(rowVendorSearch[row.id] ?? "") || v.name.toLowerCase().includes((rowVendorSearch[row.id] ?? "").toLowerCase()))
                                    .map((v) => (
                                      <CommandItem
                                        key={v.id}
                                        value={v.name}
                                        onSelect={() => setRowVendor(row.id, v.id)}
                                      >
                                        <div className="flex items-center gap-2 w-full">
                                          <Truck className="size-3.5 text-muted-foreground shrink-0" />
                                          <span className="font-medium">{v.name}</span>
                                          {row.vendorId === v.id && <Check className="size-3.5 ml-auto text-primary" />}
                                        </div>
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                                {(rowVendorSearch[row.id] ?? "") && vendorsData.filter((v) => v.name.toLowerCase().includes((rowVendorSearch[row.id] ?? "").toLowerCase())).length === 0 && (
                                  <>
                                    <CommandSeparator />
                                    <CommandGroup>
                                      <CommandItem
                                        value={`__create__ ${rowVendorSearch[row.id]}`}
                                        onSelect={async () => {
                                          try {
                                            const newVendor = await createVendor.mutateAsync((rowVendorSearch[row.id] ?? "").trim())
                                            setRowVendor(row.id, newVendor.id)
                                          } catch {
                                            /* noop */
                                          }
                                        }}
                                      >
                                        <div className="flex items-center gap-2 text-primary">
                                          <Plus className="size-4" />
                                          <span>
                                            Buat vendor baru:{" "}
                                            <span className="font-medium">&ldquo;{rowVendorSearch[row.id]}&rdquo;</span>
                                          </span>
                                        </div>
                                      </CommandItem>
                                    </CommandGroup>
                                  </>
                                )}
                                <CommandEmpty>Tidak ada vendor ditemukan.</CommandEmpty>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm h-[95%] flex flex-col">
        <CardHeader className="pb-4 shrink-0">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <Receipt className="size-4 text-muted-foreground/50" />
            Kalkulasi
          </CardTitle>
          <CardDescription className="text-xs">Ringkasan pembayaran real-time per vendor.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {activeRows.length > 0 ? (
            <div className="overflow-y-auto pr-2 flex-1 min-h-0" style={{ scrollbarGutter: "stable" }}>
              <div className="flex flex-col gap-3 pb-2">
                {groupedByVendor.map(([vendorId, group]) => (
                  <div key={vendorId} className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Truck className="size-3 text-muted-foreground/60" />
                        <span className="text-xs font-semibold text-foreground">{group.vendorName}</span>
                      </div>
                      <span className="text-[11px] tabular-nums font-medium text-muted-foreground">
                        {formatCurrency(group.subtotal)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {group.lines.map((line, i) => (
                        <div
                          key={`${line.id}-${i}`}
                          className="flex items-center justify-between py-1 text-xs"
                        >
                          <span className="text-muted-foreground truncate">{line.name}</span>
                          <span className="tabular-nums font-mono text-muted-foreground/80">
                            {line.weight.toLocaleString("id-ID", {
                              minimumFractionDigits: line.unit === "pc" ? 0 : 2,
                              maximumFractionDigits: line.unit === "pc" ? 0 : 2,
                            })} {line.unit}
                          </span>
                        </div>
                      ))}
                    </div>
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