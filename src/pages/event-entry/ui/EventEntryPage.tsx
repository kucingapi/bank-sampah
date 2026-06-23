import { useRef, useState, useEffect, useCallback } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/shared/ui/ui/button"
import { DepositForm, type DepositFormRef } from "@/features/event-entry/ui/DepositForm"
import {
  CategoryCommandDialogComponent,
  type CategoryRowEntry,
} from "@/features/event-entry/ui/CategoryCommandDialog"
import { useCategories } from "@/entities/category/api/hooks"
import { useVendors } from "@/entities/vendor/api/hooks"

interface Props {
  eventId: string
  depositId?: string | null
}

export function EventEntryPage({ eventId, depositId }: Props) {
  const formRef = useRef<DepositFormRef>(null)
  const { data: categories = [] } = useCategories()
  const { data: vendors = [] } = useVendors()
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandRows, setCommandRows] = useState<CategoryRowEntry[]>([])
  const [showNoMemberWarning, setShowNoMemberWarning] = useState(false)

  const refreshCommandRows = useCallback(() => {
    const rows = formRef.current?.getRows() ?? []
    setCommandRows(
      rows.map((r) => ({ id: r.id, categoryId: r.categoryId, vendorId: r.vendorId }))
    )
  }, [])

  // Global keyboard shortcut: Ctrl+Shift+F or Ctrl+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key === "F") || (e.ctrlKey && e.code === "Slash")) {
        e.preventDefault()
        if (!formRef.current?.hasSelectedMember()) {
          setShowNoMemberWarning(true)
          setCommandOpen(true)
        } else {
          setShowNoMemberWarning(false)
          refreshCommandRows()
          setCommandOpen((prev) => !prev)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [refreshCommandRows])

  const handleRowSelect = useCallback(
    (rowId: string) => {
      formRef.current?.focusRow(rowId)
    },
    []
  )

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: { view: "event-details", eventId } }))
  }

  const handleSuccess = () => {
    window.dispatchEvent(new CustomEvent("navigate", { detail: { view: "event-details", eventId } }))
  }

  return (
    <div className="p-12 mx-auto flex flex-col gap-10 animate-in fade-in duration-500 ease-editorial">
      {/* ── Header ── */}
      <header className="flex items-center gap-5 border-b border-border pb-5">
        <Button variant="ghost" size="icon" onClick={handleBack} title="Kembali ke detail sesi">
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {depositId ? "Perbarui" : "Detail Transaksi"} <span className="text-muted-foreground/60 font-normal">Setoran</span>
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {depositId ? "Perbarui data timbangan dan kalkulasi." : "Pencatatan timbangan dan kalkulasi real-time."}
          </p>
        </div>
      </header>

      <DepositForm ref={formRef} eventId={eventId} depositId={depositId} onSuccess={handleSuccess} />

      <CategoryCommandDialogComponent
        open={commandOpen}
        onOpenChange={(open) => {
          setCommandOpen(open)
          if (open) refreshCommandRows()
          if (!open) setShowNoMemberWarning(false)
        }}
        onSelect={handleRowSelect}
        showNoMemberWarning={showNoMemberWarning}
        rows={commandRows}
        categories={categories}
        vendors={vendors}
      />
    </div>
  )
}
