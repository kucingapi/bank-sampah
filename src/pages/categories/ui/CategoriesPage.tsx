import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import {
  listCategories,
  updateCategory,
  createCategory,
  deleteCategory,
} from "@/entities/category/api/queries"
import type { Category } from "@/entities/category/model/types"
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
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/ui/toggle-group"
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

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState("")
  const [newUnit, setNewUnit] = useState<"kg" | "pc">("kg")
  const [newRate, setNewRate] = useState("")

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const data = await listCategories()
      setCategories(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const generateSafeId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
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

      await createCategory(safeIdPreview, newName.trim(), newUnit, parseFloat(newRate))
      setNewName("")
      setNewRate("")
      setNewUnit("kg")
      await fetchCategories()
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
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      )
      await updateCategory(id, { [field]: value })
    } catch (err) {
      console.error("Update failed", err)
      await fetchCategories()
    }
  }

  const handleDelete = async (id: string) => {
    setCategoryToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return
    try {
      await deleteCategory(categoryToDelete)
      await fetchCategories()
    } catch (err) {
      console.error("Failed to delete", err)
    } finally {
      setCategoryToDelete(null)
    }
  }

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="border-b border-[#1A1A1A]/10 pb-8 pt-2">
        <h1 className="page-title text-[#1A1A1A]">
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
              <ToggleGroup
                type="single"
                value={newUnit}
                onValueChange={(value) => value && setNewUnit(value as "kg" | "pc")}
                className="bg-[#1A1A1A]/5 p-1 rounded-full w-full"
              >
                <ToggleGroupItem
                  value="kg"
                  className="flex-1 rounded-full text-xs font-medium data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  Kilogram (KG)
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="pc"
                  className="flex-1 rounded-full text-xs font-medium data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  Pieces (PC)
                </ToggleGroupItem>
              </ToggleGroup>
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
              disabled={!isFormValid}
              className="w-full"
            >
              <Plus /> Tambahkan
            </Button>
          </CardContent>
        </Card>

        <div className="col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Daftar Material</h2>
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
                {loading && categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      Memuat ledger...
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
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
                            setCategories((prev) =>
                              prev.map((c) =>
                                c.id === cat.id
                                  ? { ...c, name: e.target.value }
                                  : c
                              )
                            )
                          }
                          onBlur={(e) => {
                            if (e.target.value.trim() !== "") {
                              handleUpdate(cat.id, "name", e.target.value.trim())
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <ToggleGroup
                          type="single"
                          value={cat.unit}
                          onValueChange={(value) =>
                            value && handleUpdate(cat.id, "unit", value)
                          }
                          className="bg-muted p-0.5 rounded-full w-fit"
                        >
                          <ToggleGroupItem
                            value="kg"
                            className="px-3 py-1 rounded-full text-xs font-medium"
                          >
                            KG
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="pc"
                            className="px-3 py-1 rounded-full text-xs font-medium"
                          >
                            PC
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="tabular-nums"
                          value={cat.default_rate}
                          onChange={(e) =>
                            setCategories((prev) =>
                              prev.map((c) =>
                                c.id === cat.id
                                  ? {
                                      ...c,
                                      default_rate: parseFloat(e.target.value) || 0,
                                    }
                                  : c
                              )
                            )
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
