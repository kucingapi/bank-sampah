import { useRef, useState, useEffect, useCallback } from "react"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Button } from "@/shared/ui/ui/button"
import { DepositForm, type DepositFormRef } from "@/features/event-entry/ui/DepositForm"
import { CategoryCommandDialogComponent } from "@/features/event-entry/ui/CategoryCommandDialog"

interface Props {
  eventId: string
  depositId?: string | null
}

export function EventEntryPage({ eventId, depositId }: Props) {
  const formRef = useRef<DepositFormRef>(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [showNoMemberWarning, setShowNoMemberWarning] = useState(false)

  // Global keyboard shortcut: Ctrl+Shift+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault()
        // Guard: check if member is selected
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
  }, [])

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      formRef.current?.focusCategory(categoryId)
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
        <Button variant="ghost" size="icon" onClick={handleBack} data-icon="inline-start">
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
          if (!open) setShowNoMemberWarning(false)
        }}
        onSelect={handleCategorySelect}
        showNoMemberWarning={showNoMemberWarning}
      />
    </div>
  )
}
