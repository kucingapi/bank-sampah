import { useState, useMemo } from "react"
import { useEventRates, useUpdateEventRate } from "@/entities/event/api/hooks"
import { formatCurrency } from "@/shared/lib/format"
import { getDb } from "@/shared/api"
import { Input } from "@/shared/ui/ui/input"
import { Button } from "@/shared/ui/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Loader2, Save } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface RateWithCategory {
  event_id: string
  category_id: string
  active_rate: number
  is_active: number
  categoryName: string
  unit: string
}

interface Props {
  eventId: string
  onClose: () => void
}

export function DailyRatesEditor({ eventId, onClose }: Props) {
  const [localRates, setLocalRates] = useState<Record<string, { rate: number; active: number }>>({})
  
  const { data: ratesData, isLoading } = useEventRates(eventId)
  const updateRate = useUpdateEventRate()

  const [rates, setRates] = useState<RateWithCategory[]>([])

  useMemo(() => {
    async function load() {
      if (!ratesData) return;
      
      const db = await getDb()
      const cats = await db.select<{ id: string; name: string; unit: string }[]>(
        "SELECT id, name, unit FROM category"
      )

      const ratesWithCats = ratesData.map(r => {
        const cat = cats.find(c => c.id === r.category_id)
        return {
          ...r,
          categoryName: cat?.name || "Unknown",
          unit: cat?.unit || "kg",
        }
      })

      setRates(ratesWithCats)
      
      const initial: Record<string, { rate: number; active: number }> = {}
      ratesWithCats.forEach(r => {
        initial[r.category_id] = { rate: r.active_rate, active: r.is_active }
      })
      setLocalRates(initial)
    }
    load()
  }, [ratesData])

  const handleRateChange = (catId: string, value: string) => {
    const num = parseFloat(value) || 0
    setLocalRates(prev => ({
      ...prev,
      [catId]: { ...prev[catId], rate: num },
    }))
  }

  const handleActiveToggle = (catId: string) => {
    setLocalRates(prev => ({
      ...prev,
      [catId]: { ...prev[catId], active: prev[catId].active === 1 ? 0 : 1 },
    }))
  }

  const handleSave = async () => {
    try {
      await Promise.all(
        Object.entries(localRates).map(([catId, data]) =>
          updateRate.mutateAsync({
            eventId,
            categoryId: catId,
            activeRate: data.rate,
            isActive: data.active
          })
        )
      )
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="section-header">Nilai Tukar Aktif</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {rates.map(rate => (
            <div
              key={rate.category_id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-opacity",
                localRates[rate.category_id]?.active === 0
                  ? "opacity-50 bg-muted/30"
                  : "bg-background"
              )}
            >
              <div className="flex-1">
                <p className="font-medium">{rate.categoryName}</p>
                <p className="text-sm text-muted-foreground">
                  Tarif dasar: {formatCurrency(rate.active_rate)}/{rate.unit}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-28"
                    value={localRates[rate.category_id]?.rate || ""}
                    onChange={e => handleRateChange(rate.category_id, e.target.value)}
                    disabled={localRates[rate.category_id]?.active === 0}
                    min={0}
                    step={rate.unit === "pc" ? 1 : 100}
                  />
                  <span className="text-sm text-muted-foreground">/{rate.unit}</span>
                </div>
                
                <Button
                  variant={localRates[rate.category_id]?.active === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleActiveToggle(rate.category_id)}
                >
                  {localRates[rate.category_id]?.active === 1 ? "Aktif" : "Nonaktif"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={updateRate.isPending}>
            {updateRate.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 size-4" />}
            Simpan Perubahan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
