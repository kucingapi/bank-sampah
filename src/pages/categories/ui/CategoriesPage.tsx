import { useState, useMemo } from "react"
import { Plus, X, Archive, ArchiveRestore, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/entities/category/api/hooks"
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
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { Badge } from "@/shared/ui/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/ui/alert-dialog"

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
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const visibleCategories = categories

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
        buyRate: parseFloat(newBuyRate) || Math.floor(parseFloat(newRate) * 0.90)
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

  const handleMoveUp = async (id: string) => {
    const idx = visibleCategories.findIndex(c => c.id === id)
    if (idx <= 0) return
    const currentOrder = visibleCategories[idx].sort_order
    const prevOrder = visibleCategories[idx - 1].sort_order
    try {
      await updateCategory.mutateAsync({ id, updates: { sort_order: prevOrder } })
      await updateCategory.mutateAsync({ id: visibleCategories[idx - 1].id, updates: { sort_order: currentOrder } })
    } catch (err) {
      console.error("Reorder failed", err)
      toast.error("Gagal mengurutkan.")
    }
  }

  const handleMoveDown = async (id: string) => {
    const idx = visibleCategories.findIndex(c => c.id === id)
    if (idx < 0 || idx >= visibleCategories.length - 1) return
    const currentOrder = visibleCategories[idx].sort_order
    const nextOrder = visibleCategories[idx + 1].sort_order
    try {
      await updateCategory.mutateAsync({ id, updates: { sort_order: nextOrder } })
      await updateCategory.mutateAsync({ id: visibleCategories[idx + 1].id, updates: { sort_order: currentOrder } })
    } catch (err) {
      console.error("Reorder failed", err)
      toast.error("Gagal mengurutkan.")
    }
  }

  const handleUpdate = async (id: string, field: keyof Category, value: any) => {
    const cat = categories.find((c) => c.id === id)
    try {
      await updateCategory.mutateAsync({ id, updates: { [field]: value } })

      if (field === "archived") {
        const action = value ? "diarsipkan" : "diaktifkan untuk sesi baru"
        toast.success(`"${cat?.name}" ${action}.`, {
          description: value
            ? "Kategori tidak akan otomatis aktif di sesi baru."
            : "Kategori akan otomatis aktif di sesi baru.",
        })
      }
    } catch (err) {
      console.error("Update failed", err)
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan"
      toast.error(`Gagal memperbarui kategori: ${errorMessage}`)
    }
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
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {visibleCategories.length} entri
            </span>
          </div>

          <div className="border border-input rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Urutan</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Harga Beli</TableHead>
                  <TableHead>Harga Jual</TableHead>
                  <TableHead className="text-center w-20">Sesi Baru</TableHead>
                  <TableHead className="text-center w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      Belum ada kategori terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleCategories.map((cat, idx) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveUp(cat.id)}
                            disabled={idx === 0}
                            title="Pindah ke atas"
                            className="h-7 w-7"
                          >
                            <ArrowUp className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveDown(cat.id)}
                            disabled={idx === visibleCategories.length - 1}
                            title="Pindah ke bawah"
                            className="h-7 w-7"
                          >
                            <ArrowDown className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="font-medium"
                          defaultValue={cat.name}
                          onBlur={(e) => {
                            const newValue = e.target.value.trim()
                            if (newValue && newValue !== cat.name) {
                              handleUpdate(cat.id, "name", newValue)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newValue = (e.target as HTMLInputElement).value.trim()
                              if (newValue && newValue !== cat.name) {
                                handleUpdate(cat.id, "name", newValue)
                              }
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tabs value={cat.unit} onValueChange={(value: string) => value && handleUpdate(cat.id, "unit", value)}>
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
                          className="tabular-nums"
                          defaultValue={cat.buy_rate}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value) || 0
                            if (newValue !== cat.buy_rate) {
                              handleUpdate(cat.id, "buy_rate", newValue)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newValue = parseFloat((e.target as HTMLInputElement).value) || 0
                              if (newValue !== cat.buy_rate) {
                                handleUpdate(cat.id, "buy_rate", newValue)
                              }
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="tabular-nums"
                          defaultValue={cat.default_rate}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value) || 0
                            if (newValue !== cat.default_rate) {
                              handleUpdate(cat.id, "default_rate", newValue)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newValue = parseFloat((e.target as HTMLInputElement).value) || 0
                              if (newValue !== cat.default_rate) {
                                handleUpdate(cat.id, "default_rate", newValue)
                              }
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={cat.archived ? "secondary" : "default"}
                                className="cursor-pointer gap-1 px-2 py-0.5 text-xs transition-opacity hover:opacity-80"
                                onClick={() =>
                                  handleUpdate(cat.id, "archived", !cat.archived)
                                }
                                role="switch"
                                aria-checked={!cat.archived}
                                aria-label={cat.archived ? "Aktifkan untuk sesi baru" : "Arsipkan"}
                              >
                                {cat.archived ? (
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
                              {cat.archived
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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
