import { useRef, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog"
import { DepositForm, type DepositFormRef } from "@/features/event-entry/ui/DepositForm"
import {
  CategoryCommandDialogComponent,
  type CategoryRowEntry,
} from "@/features/event-entry/ui/CategoryCommandDialog"
import { useCategories } from "@/entities/category/api/hooks"
import { useVendors } from "@/entities/vendor/api/hooks"

interface EditDepositModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  depositId: string
}

export function EditDepositModal({ isOpen, onClose, eventId, depositId }: EditDepositModalProps) {
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
    if (!isOpen) return
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
  }, [isOpen, refreshCommandRows])

  const handleRowSelect = useCallback(
    (rowId: string) => {
      formRef.current?.focusRow(rowId)
    },
    []
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-6xl flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Edit Setoran</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 flex-1 min-h-0 overflow-hidden">
          <DepositForm
            ref={formRef}
            eventId={eventId}
            depositId={depositId}
            onSuccess={onClose}
          />
        </div>
      </DialogContent>
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
    </Dialog>
  )
}
