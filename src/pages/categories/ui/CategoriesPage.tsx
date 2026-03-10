import { useState, useMemo } from "react"
import { Plus, X } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/ui/alert-dialog"

function CategoriesPageSkeleton() {
  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="border-b border-[#1A1A1A]/10 pb-8 pt-2">
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
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-full" />
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
                  <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                  <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-32" /></TableCell>
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

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
      default_rate: cat.default_rate
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
        alert("Nama kategori sudah ada. Silakan gunakan nama yang berbeda.")
        return
      }

      await createCategory.mutateAsync({
        id: safeIdPreview,
        name: newName.trim(),
        unit: newUnit,
        defaultRate: parseFloat(newRate)
      })
      setNewName("")
      setNewRate("")
      setNewUnit("kg")
    } catch (err) {
      console.error("Failed to create", err)
      const isDuplicateId = categories.some((c) => c.id === safeIdPreview)
      if (isDuplicateId) {
        alert(
          "ID kategori sudah digunakan. Gunakan nama yang berbeda untuk menghasilkan ID unik."
        )
      } else {
        alert("Gagal membuat kategori. Silakan coba lagi.")
      }
    }
  }

  const handleUpdate = async (id: string, field: keyof Category, value: any) => {
    try {
      await updateCategory.mutateAsync({ id, updates: { [field]: value } })
    } catch (err) {
      console.error("Update failed", err)
    }
  }

  const handleDelete = async (id: string) => {
    setCategoryToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return
    try {
      await deleteCategory.mutateAsync(categoryToDelete)
    } catch (err) {
      console.error("Failed to delete", err)
    } finally {
      setCategoryToDelete(null)
    }
  }

  if (isLoading && categories.length === 0) {
    return <CategoriesPageSkeleton />
  }

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="border-b border-[#1A1A1A]/10 pb-8 pt-2">
        <h1 className="text-3xl font-semibold text-[#1A1A1A]">
          Skema <span className="text-[#1A1A1A]/40">Kategori</span>
        </h1>
        <p className="mt-2 text-[#1A1A1A]/50 text-sm">
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
              <label className="micro-label text-[#1A1A1A]/50 mb-2 block">
                Nama Material
              </label>
              <Input
                placeholder="Contoh: Kaleng Aluminium"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <p className="text-xs text-[#1A1A1A]/30 mt-2 font-mono break-all">
                ID: {safeIdPreview || "akan-dihasilkan-otomatis"}
              </p>
            </div>

            <div>
              <label className="micro-label text-[#1A1A1A]/50 mb-2 block">
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

            <div>
              <label className="micro-label text-[#1A1A1A]/50 mb-2 block">
                Harga Dasar (Rp)
              </label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                className="tabular-nums"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
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
            <span className="text-sm font-medium text-[#1A1A1A]/50">
              {categories.length} entri
            </span>
          </div>

          <div className="border border-input rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Harga Dasar (Rp)</TableHead>
                  <TableHead className="text-center w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      Belum ada kategori terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <Input
                          className="font-medium"
                          value={cat.name}
                          onChange={(e) =>
                            handleUpdate(cat.id, "name", e.target.value)
                          }
                          onBlur={(e) => {
                            if (e.target.value.trim() !== "") {
                              handleUpdate(cat.id, "name", e.target.value.trim())
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
                          value={cat.default_rate}
                          onChange={(e) =>
                            handleUpdate(cat.id, "default_rate", parseFloat(e.target.value) || 0)
                          }
                          onBlur={(e) =>
                            handleUpdate(
                              cat.id,
                              "default_rate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
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

          <p className="text-[#1A1A1A]/40 text-xs leading-relaxed max-w-xl">
            Perubahan Harga Dasar secara langsung (in-line edit) tidak mengubah
            riwayat data pada Sesi Aktif maupun Sesi Selesai. Harga baru akan
            diterapkan pada pembuatan Sesi berikutnya, atau dengan melakukan
            sinkronisasi harga manual pada menu Daftar Sesi.
          </p>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus kategori ini secara permanen dari daftar master?
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
