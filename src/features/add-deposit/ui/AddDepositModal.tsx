import { useRef, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog"
import { DepositForm, type DepositFormRef } from "@/features/event-entry/ui/DepositForm"
import { CategoryCommandDialogComponent } from "@/features/event-entry/ui/CategoryCommandDialog"

interface AddDepositModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
}

export function AddDepositModal({ isOpen, onClose, eventId }: AddDepositModalProps) {
  const formRef = useRef<DepositFormRef>(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [showNoMemberWarning, setShowNoMemberWarning] = useState(false)

  // Reset form state when modal re-opens
  const [key, setKey] = useState(0)

  // Global keyboard shortcut: Ctrl+Shift+F
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault()
        if (!formRef.current?.hasSelectedMember()) {
          setShowNoMemberWarning(true)
          setCommandOpen(true)
        } else {
          setShowNoMemberWarning(false)
          setCommandOpen((prev) => !prev)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      formRef.current?.focusCategory(categoryId)
    },
    []
  )

  const handleSuccess = () => {
    onClose()
    // Force remount on next open for a fresh form
    setKey((k) => k + 1)
  }

  const handleClose = () => {
    setKey((k) => k + 1)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Tambah Setoran</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 flex-1 min-h-0 overflow-hidden">
          <DepositForm
            key={key}
            ref={formRef}
            eventId={eventId}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
      <CategoryCommandDialogComponent
        open={commandOpen}
        onOpenChange={(open) => {
          setCommandOpen(open)
          if (!open) setShowNoMemberWarning(false)
        }}
        onSelect={handleCategorySelect}
        showNoMemberWarning={showNoMemberWarning}
      />
    </Dialog>
  )
}
