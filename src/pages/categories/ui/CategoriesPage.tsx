import { useState, useMemo, useEffect, useCallback } from "react"
import { Plus, X, Archive, ArchiveRestore, Save, GripVertical, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/entities/category/api/hooks"
import { useVendors } from "@/entities/vendor/api/hooks"
import { getOrCreateDefaultVendors } from "@/entities/vendor/api/queries"
import type { Category } from "@/entities/category/model/types"
import { ExportCSVButton } from "@/shared/ui/ExportCSVButton"
import { exportToCSV } from "@/shared/lib/csv"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/shared/ui/ui/table"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/ui/select"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { Badge } from "@/shared/ui/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/ui/alert-dialog"

function SortableTableRow({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-muted/50" : ""}>
      {children}
    </TableRow>
  )
}

function DragHandle({ id }: { id: string }) {
  const {
    attributes,
    listeners,
  } = useSortable({ id })

  return (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      title="Seret untuk mengurutkan"
    >
      <GripVertical className="size-4" />
    </button>
  )
}

function CategoriesPageSkeleton() {
  return (
    <div className="p-12 mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="border-b border-border pb-8 pt-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-4" />
      </header>

      <div className="grid grid-cols-3 gap-12">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-5 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        <div className="col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>

          <div className="border border-input rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead className="text-center w-20"><Skeleton className="h-4 w-16 mx-auto" /></TableHead>
                  <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-10 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CategoriesPage() {
  const [newName, setNewName] = useState("")
  const [newUnit, setNewUnit] = useState<"kg" | "pc">("kg")
  const [newRate, setNewRate] = useState("")
  const [newBuyRate, setNewBuyRate] = useState("")
  const [buyRateManuallySet, setBuyRateManuallySet] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  const { data: categories = [], isLoading } = useCategories()
  const { data: vendors = [] } = useVendors()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  // Load default vendor IDs (Lainnya for new categories)
  const [defaultVendorIds, setDefaultVendorIds] = useState<{ bsm: number; lainnya: number } | null>(null)
  useEffect(() => {
    async function loadDefaults() {
      const defaults = await getOrCreateDefaultVendors()
      setDefaultVendorIds({ bsm: defaults.bsm.id, lainnya: defaults.lainnya.id })
    }
    loadDefaults()
  }, [])

  // Local state for pending reorder changes
  const [localOrder, setLocalOrder] = useState<string[]>([])

  // Local state for pending inline edits: { categoryId: { field: value, ... } }
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<Category>>>({})

  // Check if there are any pending changes (reorder + inline edits)
  const hasPendingChanges = useMemo(() => {
    const hasReorder = localOrder.length > 0 && JSON.stringify(localOrder) !== JSON.stringify(categories.map(c => c.id))
    const hasEdits = Object.keys(localEdits).length > 0
    return hasReorder || hasEdits
  }, [localOrder, localEdits, categories])

  // Check if a specific category has pending edits
  const hasCategoryEdit = useCallback((id: string) => {
    return Object.keys(localEdits).includes(id)
  }, [localEdits])

  // Initialize local order from fetched categories
  useEffect(() => {
    if (categories.length > 0 && localOrder.length === 0) {
      setLocalOrder(categories.map(c => c.id))
    }
  }, [categories])

  // Sync localOrder if categories change externally (e.g., after create/delete)
  useEffect(() => {
    const currentOrder = categories.map(c => c.id)
    const hasReorder = localOrder.length > 0 && JSON.stringify(localOrder) !== JSON.stringify(currentOrder)
    if (!hasReorder && JSON.stringify(localOrder) !== JSON.stringify(currentOrder)) {
      setLocalOrder(currentOrder)
    }
  }, [categories])

  const savePendingChanges = useCallback(async () => {
    if (!hasPendingChanges) return

    try {
      const promises: Promise<unknown>[] = []

      // Save reorder changes (only if localOrder is populated and differs from DB)
      const currentOrder = categories.map(c => c.id)
      const hasReorder = localOrder.length > 0 && JSON.stringify(localOrder) !== JSON.stringify(currentOrder)
      if (hasReorder) {
        localOrder.forEach((id, index) => {
          promises.push(
            updateCategory.mutateAsync({ id, updates: { sort_order: index } })
          )
        })
      }

      // Save inline edit changes
      Object.entries(localEdits).forEach(([id, edits]) => {
        if (Object.keys(edits).length > 0) {
          promises.push(
            updateCategory.mutateAsync({ id, updates: edits })
          )
        }
      })

      await Promise.all(promises)

      toast.success("Perubahan kategori berhasil disimpan.")
      setLocalEdits({})
      setLocalOrder([])
    } catch (err) {
      console.error("Failed to save changes", err)
      toast.error("Gagal menyimpan perubahan kategori.")
    }
  }, [hasPendingChanges, localOrder, localEdits, categories, updateCategory])

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const visibleCategories = useMemo(() => {
    if (localOrder.length === 0) return categories
    // Return categories in the local order
    return localOrder
      .map(id => categories.find(c => c.id === id))
      .filter((c): c is Category => c !== undefined)
  }, [categories, localOrder])

  // Get display value for a field (local edit if exists, otherwise DB value)
  const getDisplayValue = useCallback((id: string, field: keyof Category) => {
    if (localEdits[id] && localEdits[id][field] !== undefined) {
      return localEdits[id][field]
    }
    const cat = categories.find(c => c.id === id)
    return cat ? cat[field] : undefined
  }, [categories, localEdits])

  const generateSafeId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const categoriesForExport = useMemo(() => {
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      unit: cat.unit,
      default_rate: cat.default_rate,
      buy_rate: cat.buy_rate,
      archived: cat.archived ? 'yes' : 'no'
    }))
  }, [categories])

  const handleExport = () => {
    exportToCSV(categoriesForExport, "material-categories")
  }

  const safeIdPreview = generateSafeId(newName)
  const isFormValid = newName.trim().length > 0 && parseFloat(newRate) > 0

  const handleCreate = async () => {
    if (!isFormValid) return
    try {
      const existingCategory = categories.find(
        (c) => c.name.toLowerCase() === newName.trim().toLowerCase()
      )
      if (existingCategory) {
        toast.error("Nama kategori sudah ada. Silakan gunakan nama yang berbeda.")
        return
      }

      await createCategory.mutateAsync({
        id: safeIdPreview,
        name: newName.trim(),
        unit: newUnit,
        defaultRate: parseFloat(newRate),
        buyRate: parseFloat(newBuyRate) || Math.floor(parseFloat(newRate) * 0.90),
        defaultVendorId: defaultVendorIds?.lainnya ?? null,
      })
      toast.success(`"${newName.trim()}" berhasil ditambahkan.`)
      setNewName("")
      setNewRate("")
      setNewBuyRate("")
      setBuyRateManuallySet(false)
      setNewUnit("kg")
    } catch (err) {
      console.error("Failed to create", err)
      const isDuplicateId = categories.some((c) => c.id === safeIdPreview)
      if (isDuplicateId) {
        toast.error(
          "ID kategori sudah digunakan. Gunakan nama yang berbeda untuk menghasilkan ID unik."
        )
      } else {
        toast.error("Gagal membuat kategori. Silakan coba lagi.")
      }
    }
  }

  const handleSortAlphabetically = () => {
    const sorted = [...categories]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => c.id)
    setLocalOrder(sorted)
    toast.info("Urutan diubah menjadi A → Z. Klik \"Simpan Perubahan\" untuk menyimpan.")
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Batch inline edit locally — no DB save until user clicks "Simpan"
  const handleLocalEdit = (id: string, field: keyof Category, value: any) => {
    setLocalEdits(prev => {
      const existing = prev[id] || {}
      // If value is same as DB original, remove from edits (no change needed)
      const cat = categories.find(c => c.id === id)
      if (cat && cat[field] === value) {
        const { [field]: _, ...rest } = existing
        if (Object.keys(rest).length === 0) {
          const { [id]: __, ...restEdits } = prev
          return restEdits
        }
        return { ...prev, [id]: rest }
      }
      return { ...prev, [id]: { ...existing, [field]: value } }
    })
  }

  const handleDelete = async (id: string) => {
    setCategoryToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return
    const cat = categories.find((c) => c.id === categoryToDelete)
    try {
      await deleteCategory.mutateAsync(categoryToDelete)
      toast.success(`"${cat?.name}" berhasil dihapus.`)
    } catch (err) {
      console.error("Failed to delete", err)
      toast.error("Gagal menghapus kategori.")
    } finally {
      setCategoryToDelete(null)
    }
  }

  if (isLoading && categories.length === 0) {
    return <CategoriesPageSkeleton />
  }

  return (
    <div className="p-12 mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="border-b border-border pb-8 pt-2">
        <h1 className="text-3xl font-semibold text-foreground">
          Skema <span className="text-muted-foreground/60">Kategori</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Pengaturan master material, harga dasar, dan satuan ukur.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-12">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="section-header">Tentukan Material Baru</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div>
              <label className="micro-label text-muted-foreground mb-2 block">
                Nama Material
              </label>
              <Input
                placeholder="Contoh: Kaleng Aluminium"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground/40 mt-2 font-mono break-all">
                ID: {safeIdPreview || "akan-dihasilkan-otomatis"}
              </p>
            </div>

            <div>
              <label className="micro-label text-muted-foreground mb-2 block">
                Satuan (Unit)
              </label>
              <Tabs value={newUnit} onValueChange={(value: string) => setNewUnit(value as "kg" | "pc")}>
                <TabsList className="w-full">
                  <TabsTrigger value="kg" className="flex-1">
                    Kilogram (KG)
                  </TabsTrigger>
                  <TabsTrigger value="pc" className="flex-1">
                    Pieces (PC)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="micro-label text-muted-foreground mb-2 block">
                  Harga Dasar Beli ke Nasabah (Rp)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  className="tabular-nums"
                  value={newBuyRate}
                  onChange={(e) => {
                    setNewBuyRate(e.target.value)
                    setBuyRateManuallySet(true)
                  }}
                />
              </div>
              <div>
                <label className="micro-label text-muted-foreground mb-2 block">
                  Harga Dasar Jual ke Vendor (Rp)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  className="tabular-nums"
                  value={newRate}
                  onChange={(e) => {
                    const val = e.target.value
                    setNewRate(val)
                    if (!buyRateManuallySet && val) {
                      setNewBuyRate(String(Math.floor(parseFloat(val) * 0.90)))
                    }
                  }}
                />
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={!isFormValid || createCategory.isPending}
              className="w-full"
            >
              <Plus /> Tambahkan
            </Button>
          </CardContent>
        </Card>

        <div className="col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="section-header">Daftar Material</h2>
              <ExportCSVButton onExport={handleExport} filename="categories" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSortAlphabetically}
                className="gap-2"
              >
                <ArrowUpDown className="size-3" />
                Urutkan A → Z
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {hasPendingChanges && (
                <Button
                  onClick={savePendingChanges}
                  disabled={updateCategory.isPending}
                  size="sm"
                  className="gap-2"
                >
                  <Save className="size-4" />
                  Simpan Perubahan
                </Button>
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {visibleCategories.length} entri
              </span>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="border border-input rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead>Harga Beli</TableHead>
                      <TableHead>Harga Jual</TableHead>
                      <TableHead>Vendor Bawaan</TableHead>
                      <TableHead className="text-center w-20">Sesi Baru</TableHead>
                      <TableHead className="text-center w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                          Belum ada kategori terdaftar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleCategories.map((cat) => {
                        const displayName = getDisplayValue(cat.id, "name") as string | undefined ?? cat.name
                        const displayUnit = getDisplayValue(cat.id, "unit") as string | undefined ?? cat.unit
                        const displayBuyRate = getDisplayValue(cat.id, "buy_rate") as number | undefined ?? cat.buy_rate
                        const displaySellRate = getDisplayValue(cat.id, "default_rate") as number | undefined ?? cat.default_rate
                        const displayArchived = getDisplayValue(cat.id, "archived") as boolean | undefined ?? cat.archived
                        const displayVendorId = getDisplayValue(cat.id, "default_vendor_id") as number | undefined ?? cat.default_vendor_id
                        const isEdited = hasCategoryEdit(cat.id)

                        return (
                        <SortableTableRow key={cat.id} id={cat.id}>
                          <TableCell>
                            <DragHandle id={cat.id} />
                          </TableCell>
                          <TableCell>
                            <Input
                              className={`font-medium ${isEdited ? "border-primary/50 bg-primary/5" : ""}`}
                              value={displayName}
                              onChange={(e) => {
                                const newValue = e.target.value.trim()
                                if (newValue) {
                                  handleLocalEdit(cat.id, "name", newValue)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const newValue = (e.target as HTMLInputElement).value.trim()
                                  if (newValue) {
                                    handleLocalEdit(cat.id, "name", newValue)
                                  }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Tabs value={displayUnit} onValueChange={(value: string) => value && handleLocalEdit(cat.id, "unit", value)}>
                              <TabsList className="w-fit">
                                <TabsTrigger value="kg" className="px-3 py-1 text-xs font-medium">
                                  KG
                                </TabsTrigger>
                                <TabsTrigger value="pc" className="px-3 py-1 text-xs font-medium">
                                  PC
                                </TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className={`tabular-nums ${isEdited ? "border-primary/50 bg-primary/5" : ""}`}
                              value={displayBuyRate}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0
                                handleLocalEdit(cat.id, "buy_rate", newValue)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const newValue = parseFloat((e.target as HTMLInputElement).value) || 0
                                  handleLocalEdit(cat.id, "buy_rate", newValue)
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className={`tabular-nums ${isEdited ? "border-primary/50 bg-primary/5" : ""}`}
                              value={displaySellRate}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0
                                handleLocalEdit(cat.id, "default_rate", newValue)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const newValue = parseFloat((e.target as HTMLInputElement).value) || 0
                                  handleLocalEdit(cat.id, "default_rate", newValue)
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={displayVendorId ? String(displayVendorId) : String(defaultVendorIds?.lainnya ?? '')}
                              onValueChange={(val) => {
                                // Prevent setting to null — always default to Lainnya
                                handleLocalEdit(cat.id, "default_vendor_id", parseInt(val))
                              }}
                              disabled={!defaultVendorIds}
                            >
                              <SelectTrigger className="w-full h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {vendors.map(v => (
                                  <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={displayArchived ? "secondary" : "default"}
                                    className={`cursor-pointer gap-1 px-2 py-0.5 text-xs transition-opacity hover:opacity-80 ${isEdited ? "ring-2 ring-primary/30" : ""}`}
                                    onClick={() =>
                                      handleLocalEdit(cat.id, "archived", !displayArchived)
                                    }
                                    role="switch"
                                    aria-checked={!displayArchived}
                                    aria-label={displayArchived ? "Aktifkan untuk sesi baru" : "Arsipkan"}
                                  >
                                    {displayArchived ? (
                                      <>
                                        <Archive className="size-3" />
                                        Arsip
                                      </>
                                    ) : (
                                      <>
                                        <ArchiveRestore className="size-3" />
                                        Aktif
                                      </>
                                    )}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {displayArchived
                                    ? "Kategori diarsipkan — tidak otomatis aktif di sesi baru. Klik untuk mengaktifkan."
                                    : "Kategori aktif — otomatis tersedia di sesi baru. Klik untuk mengarsipkan."}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(cat.id)}
                              title="Hapus Kategori"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="size-4" />
                            </Button>
                          </TableCell>
                        </SortableTableRow>
                      )})
                    )}
                  </TableBody>
                </Table>
              </div>
            </SortableContext>
          </DndContext>

          <p className="text-muted-foreground/60 text-xs leading-relaxed max-w-xl">
            Perubahan Harga Dasar secara langsung (in-line edit) tidak mengubah
            riwayat data pada Sesi Aktif maupun Sesi Selesai. Harga baru akan
            diterapkan pada pembuatan Sesi berikutnya, atau dengan melakukan
            sinkronisasi harga manual pada menu Daftar Sesi.
          </p>
          <p className="text-muted-foreground/60 text-xs leading-relaxed max-w-xl">
            Kolom <strong>Sesi Baru</strong> menentukan apakah kategori otomatis aktif saat sesi baru dibuat.
            Kategori yang diarsipkan tetap terlihat dan dapat diedit, tetapi tidak otomatis aktif di sesi baru.
          </p>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus <strong>{categories.find((c) => c.id === categoryToDelete)?.name}</strong> secara permanen dari daftar master?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
