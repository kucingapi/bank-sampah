import { useState, useEffect, useCallback } from "react"
import { Hash, AlertCircle } from "lucide-react"
import { useCategories } from "@/entities/category/api/hooks"
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

interface CategoryCommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (categoryId: string) => void
  showNoMemberWarning?: boolean
}

export function CategoryCommandDialogComponent({ open, onOpenChange, onSelect, showNoMemberWarning }: CategoryCommandDialogProps) {
  const { data: categories = [] } = useCategories()
  const [search, setSearch] = useState("")

  // Reset search and warning when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("")
    }
  }, [open])

  const handleSelect = useCallback(
    (categoryId: string) => {
      onSelect(categoryId)
      onOpenChange(false)
    },
    [onSelect, onOpenChange]
  )

  const activeCategories = categories.filter((c) => c.status === "active" || c.status === "")

  const filtered = search
    ? activeCategories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.id.toLowerCase().includes(search.toLowerCase())
      )
    : activeCategories

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Cari kategori…"
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
        <CommandEmpty>Tidak ada kategori ditemukan.</CommandEmpty>
        <CommandGroup heading="Kategori Setoran">
          {filtered.map((cat) => (
            <CommandItem
              key={cat.id}
              value={`${cat.id} ${cat.name}`}
              onSelect={() => handleSelect(cat.id)}
              className="cursor-pointer"
            >
              <Hash className="size-4 text-muted-foreground/50 shrink-0" />
              <span className="flex-1 font-medium">{cat.name}</span>
              <Badge variant="outline" className="text-[11px] font-mono tabular-nums">
                {cat.unit}
              </Badge>
              <span className="text-xs text-muted-foreground/60 font-mono ml-1">
                {formatCurrency(cat.default_rate)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
