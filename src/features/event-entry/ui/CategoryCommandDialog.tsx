import { useState, useEffect, useCallback, useMemo } from "react"
import { Hash, AlertCircle, Truck } from "lucide-react"
import { formatCurrency } from "@/shared/lib/format"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/shared/ui/ui/command"
import { Badge } from "@/shared/ui/ui/badge"
import { Separator } from "@/shared/ui/ui/separator"
import type { Category } from "@/entities/category/model/types"
import type { Vendor } from "@/entities/vendor/model/types"

export interface CategoryRowEntry {
  id: string
  categoryId: string
  vendorId: number | null
}

interface CategoryCommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (rowId: string) => void
  showNoMemberWarning?: boolean
  rows: CategoryRowEntry[]
  categories: Category[]
  vendors: Vendor[]
}

export function CategoryCommandDialogComponent({
  open,
  onOpenChange,
  onSelect,
  showNoMemberWarning,
  rows,
  categories,
  vendors,
}: CategoryCommandDialogProps) {
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (open) {
      setSearch("")
    }
  }, [open])

  const handleSelect = useCallback(
    (rowId: string) => {
      onSelect(rowId)
      onOpenChange(false)
    },
    [onSelect, onOpenChange]
  )

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((c) => map.set(c.id, c))
    return map
  }, [categories])

  const vendorById = useMemo(() => {
    const map = new Map<number, string>()
    vendors.forEach((v) => map.set(v.id, v.name))
    return map
  }, [vendors])

  const entries = useMemo(() => {
    return rows
      .map((row) => {
        const category = categoryById.get(row.categoryId)
        if (!category) return null
        return {
          rowId: row.id,
          categoryId: row.categoryId,
          categoryName: category.name,
          unit: category.unit,
          defaultRate: category.default_rate,
          vendorName: row.vendorId != null ? vendorById.get(row.vendorId) ?? null : null,
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
  }, [rows, categoryById, vendorById])

  const filtered = search
    ? entries.filter((e) => {
        const q = search.toLowerCase()
        return (
          e.categoryName.toLowerCase().includes(q) ||
          e.categoryId.toLowerCase().includes(q) ||
          (e.vendorName?.toLowerCase().includes(q) ?? false)
        )
      })
    : entries

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Cari baris setoran…"
        value={search}
        onValueChange={setSearch}
      />
      {showNoMemberWarning && (
        <>
          <div className="px-4 py-3 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-800/30 flex items-start gap-2.5">
            <AlertCircle className="size-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Pilih Penyetor terlebih dahulu
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Anda harus memilih penyetor sebelum mengisi timbangan.
              </p>
            </div>
          </div>
          <Separator />
        </>
      )}
      <CommandList>
        <CommandEmpty>Tidak ada baris ditemukan.</CommandEmpty>
        <CommandGroup heading="Baris Setoran">
          {filtered.map((entry) => (
            <CommandItem
              key={entry.rowId}
              value={`${entry.categoryId} ${entry.categoryName} ${entry.vendorName ?? ""}`}
              onSelect={() => handleSelect(entry.rowId)}
              className="cursor-pointer"
            >
              <Hash className="size-4 text-muted-foreground/50 shrink-0" />
              <span className="flex-1 font-medium">{entry.categoryName}</span>
              {entry.vendorName && (
                <Badge variant="secondary" className="text-[10px] font-medium gap-1 px-1.5 py-0 rounded-md shrink-0">
                  <Truck className="size-2.5" />
                  {entry.vendorName}
                </Badge>
              )}
              <Badge variant="outline" className="text-[11px] font-mono tabular-nums">
                {entry.unit}
              </Badge>
              <span className="text-xs text-muted-foreground/60 font-mono ml-1">
                {formatCurrency(entry.defaultRate)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
