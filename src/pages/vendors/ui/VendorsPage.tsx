import { useState } from "react"
import { Plus, X } from "lucide-react"
import {
  useVendors,
  useCreateVendor,
  useDeleteVendor,
} from "@/entities/vendor/api/hooks"
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

function VendorsPageSkeleton() {
  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
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
                  <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
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

export function VendorsPage() {
  const [newName, setNewName] = useState("")

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vendorToDelete, setVendorToDelete] = useState<number | null>(null)

  const { data: vendors = [], isLoading } = useVendors()
  const createVendor = useCreateVendor()
  const deleteVendor = useDeleteVendor()

  const handleExport = () => {
    const exportData = vendors.map(v => ({
      id: v.id,
      name: v.name
    }))
    exportToCSV(exportData, "vendors")
  }

  const isFormValid = newName.trim().length > 0

  const handleCreate = async () => {
    if (!isFormValid) return
    try {
      const existingVendor = vendors.find(
        (v) => v.name.toLowerCase() === newName.trim().toLowerCase()
      )
      if (existingVendor) {
        alert("Nama vendor sudah ada. Silakan gunakan nama yang berbeda.")
        return
      }

      await createVendor.mutateAsync(newName.trim())
      setNewName("")
    } catch (err) {
      console.error("Failed to create", err)
      alert("Gagal membuat vendor. Silakan coba lagi.")
    }
  }

  const handleDelete = async (id: number) => {
    setVendorToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!vendorToDelete) return
    try {
      await deleteVendor.mutateAsync(vendorToDelete)
    } catch (err) {
      console.error("Failed to delete", err)
    } finally {
      setVendorToDelete(null)
    }
  }

  if (isLoading && vendors.length === 0) {
    return <VendorsPageSkeleton />
  }

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="border-b border-border pb-8 pt-2">
        <h1 className="text-3xl font-semibold text-foreground">
          Data <span className="text-muted-foreground/60">Vendor</span>
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Pengaturan master vendor untuk alokasi material pada laporan manifest.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-12">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="section-header">Tambah Vendor Baru</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div>
              <label className="micro-label text-muted-foreground mb-2 block">
                Nama Vendor
              </label>
              <Input
                placeholder="Contoh: Pabrik Kertas Nusantara"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={!isFormValid || createVendor.isPending}
              className="w-full"
            >
              <Plus /> Tambahkan
            </Button>

            <p className="text-muted-foreground/60 text-xs leading-relaxed">
              Vendor "BSM" dan "Lainnya" akan dibuat secara otomatis jika belum ada.
            </p>
          </CardContent>
        </Card>

        <div className="col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="section-header">Daftar Vendor</h2>
              <ExportCSVButton onExport={handleExport} filename="vendors" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {vendors.length} entri
            </span>
          </div>

          <div className="border border-input rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Vendor</TableHead>
                  <TableHead className="text-center w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="py-12 text-center text-muted-foreground">
                      Belum ada vendor terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">
                        {vendor.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(vendor.id)}
                          title="Hapus Vendor"
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
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus vendor ini secara permanen dari daftar master?
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