import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/ui/dialog"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Archive, RotateCcw, RefreshCw, Save, X } from "lucide-react"
import { formatCurrency } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"

interface AllRatesModalProps {
  isOpen: boolean
  onClose: () => void
  rates: Array<{
    category_id: string
    active_rate: number
    outbound_rate: number
    is_active: number
    name: string
    unit: string
  }>
  isEditingRates: boolean
  localRates: Record<string, { buyRate: number; sellRate: number; active: number }>
  _savedRates?: Record<string, { buyRate: number; sellRate: number; active: number }>
  categories: Record<string, { name: string; unit: string }>
  onSellRateChange: (catId: string, value: string) => void
  onBuyRateChange: (catId: string, value: string) => void
  onActiveToggle: (catId: string) => void
  onSyncRates: () => void
  onSaveRates: () => void
  onToggleEdit: () => void
  isSyncPending: boolean
  isSavePending: boolean
  hasUnsavedChanges: boolean
}

export function AllRatesModal({
  isOpen,
  onClose,
  rates,
  isEditingRates,
  localRates,
  categories,
  onSellRateChange,
  onBuyRateChange,
  onActiveToggle,
  onSyncRates,
  onSaveRates,
  onToggleEdit,
  isSyncPending,
  isSavePending,
  hasUnsavedChanges,
}: AllRatesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>Semua Kategori Nilai Tukar</DialogTitle>
              {hasUnsavedChanges && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  Belum Disimpan
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={onSyncRates}
                disabled={isSyncPending || !isEditingRates}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={isSyncPending ? "animate-spin size-3" : "size-3"} />
                <span className="ml-2">Sinkronisasi Harga Dasar</span>
              </Button>
              {isEditingRates && (
                <Button
                  onClick={onToggleEdit}
                  disabled={isSavePending}
                  size="sm"
                  variant="outline"
                >
                  <X className="size-3" />
                  <span className="ml-2">Batal</span>
                </Button>
              )}
              <Button
                onClick={isEditingRates ? onSaveRates : onToggleEdit}
                disabled={isSavePending}
                size="sm"
                variant={isEditingRates ? "default" : "outline"}
                className={isEditingRates ? "bg-foreground hover:bg-foreground/80" : ""}
              >
                <Save className="size-3" />
                <span className="ml-2">{isEditingRates ? "Simpan" : "Edit"}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {rates.map(rate => {
            const cat = localRates[rate.category_id]
            const catInfo = categories[rate.category_id]
            const isActive = cat?.active !== 0
            const sellRate = cat?.sellRate ?? rate.outbound_rate
            const buyRate = cat?.buyRate ?? rate.active_rate

            return (
              <div
                key={rate.category_id}
                className={cn(
                  "flex flex-col gap-3 p-4 rounded-lg border transition-opacity",
                  !isActive ? "opacity-50 bg-muted/30" : "bg-background"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    {catInfo?.name ?? rate.name ?? rate.category_id}
                  </p>
                  {isEditingRates && (
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onActiveToggle(rate.category_id)}
                    >
                      {isActive ? (
                        <Archive className="size-3" />
                      ) : (
                        <RotateCcw className="size-3" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Jual ke Vendor
                    </label>
                    <Input
                      type="number"
                      className="w-full h-9 text-sm tabular-nums"
                      value={sellRate}
                      onChange={e => onSellRateChange(rate.category_id, e.target.value)}
                      disabled={!isActive || !isEditingRates}
                      min={0}
                      step={catInfo?.unit === "pc" ? 1 : 100}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(sellRate)}/{catInfo?.unit ?? rate.unit}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Beli dari Nasabah
                    </label>
                    <Input
                      type="number"
                      className="w-full h-9 text-sm tabular-nums"
                      value={buyRate}
                      onChange={e => onBuyRateChange(rate.category_id, e.target.value)}
                      disabled={!isActive || !isEditingRates}
                      min={0}
                      step={catInfo?.unit === "pc" ? 1 : 100}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(buyRate)}/{catInfo?.unit ?? rate.unit}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
