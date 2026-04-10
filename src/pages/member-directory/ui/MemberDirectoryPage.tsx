import { useState } from "react"
import { Search, Plus } from "lucide-react"
import { useMembers, useUpdateMember } from "@/entities/member/api/hooks"
import type { Member } from "@/entities/member/model/types"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/shared/ui/ui/table"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { AddMemberModal } from "@/features/add-member/ui/AddMemberModal"

function TableSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="p-4 bg-muted/30 border-b">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border-b last:border-b-0 grid grid-cols-4 gap-4">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  )
}

export function MemberDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { data: members = [], isLoading } = useMembers({
    search: searchQuery,
  })

  const updateMember = useUpdateMember()

  const handleUpdate = async (id: number, field: keyof Pick<Member, 'name' | 'address' | 'phone'>, value: string) => {
    try {
      await updateMember.mutateAsync({ id, updates: { [field]: value } })
    } catch (err) {
      console.error("Update failed", err)
    }
  }

  return (
    <div className="p-12 mx-auto flex flex-col gap-8 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Anggota
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Data anggota terdaftar.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus /> Tambah Anggota
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-6 p-4 bg-muted border border-border rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan ID atau Nama..."
            className="pl-12 bg-background border-none focus-visible:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div>
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>No. Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      Belum ada anggota.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{m.id}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="font-medium bg-transparent border-none focus-visible:ring-1 h-8"
                          value={m.name}
                          onChange={(e) => handleUpdate(m.id, "name", e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value.trim()) {
                              handleUpdate(m.id, "name", e.target.value.trim())
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="bg-transparent border-none focus-visible:ring-1 h-8 tabular-nums text-muted-foreground"
                          value={m.phone || ""}
                          placeholder="—"
                          onChange={(e) => handleUpdate(m.id, "phone", e.target.value)}
                          onBlur={(e) => handleUpdate(m.id, "phone", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="bg-transparent border-none focus-visible:ring-1 h-8 text-muted-foreground"
                          value={m.address || ""}
                          placeholder="—"
                          onChange={(e) => handleUpdate(m.id, "address", e.target.value)}
                          onBlur={(e) => handleUpdate(m.id, "address", e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  )
}
