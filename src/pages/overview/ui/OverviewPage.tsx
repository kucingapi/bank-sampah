import { useState } from "react"
import { useDashboardStats, useCategoryBreakdown } from "../api/hooks"
import { formatCurrency } from "@/shared/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Progress } from "@/shared/ui/ui/progress"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { Badge } from "@/shared/ui/ui/badge"
import { DateRangePicker } from "@/shared/ui/ui/date-picker-range"
import { StatsCardSkeleton } from "@/shared/ui/skeletons"

function OverviewPageSkeleton() {
  return (
    <div className="p-12 mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </section>

      <section className="flex flex-col gap-6 pt-6">
        <Skeleton className="h-5 w-40" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function OverviewPage() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  const dateStart = dateRange.from ? dateRange.from.toISOString().split('T')[0] : undefined
  const dateEnd = dateRange.to ? dateRange.to.toISOString().split('T')[0] : undefined

  const { data: stats, isLoading: statsLoading } = useDashboardStats(dateStart, dateEnd)
  const { data: breakdown = [], isLoading: breakdownLoading } = useCategoryBreakdown(dateStart, dateEnd)

  if (statsLoading) {
    return <OverviewPageSkeleton />
  }

  const safeStats = stats || { totalWeight: 0, totalPayout: 0, activeMembers: 0 }

  return (
    <div className="p-12 mx-auto flex flex-col gap-12">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Tinjauan <span className="text-muted-foreground/60">Dasbor</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-sm">
            Ringkasan operasional dan metrik fasilitas.
          </p>
        </div>

        <DateRangePicker
          showCompare={false}
          onUpdate={({ range }) => {
            setDateRange({ from: range.from, to: range.to })
          }}
        />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="micro-label text-muted-foreground font-normal">
              Total Terkumpul
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">
                {safeStats.totalWeight.toLocaleString("id-ID")}
              </span>
              <span className="text-muted-foreground font-medium">kg</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="micro-label text-muted-foreground font-normal">
              Dana Disalurkan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">
                {formatCurrency(safeStats.totalPayout)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="micro-label text-muted-foreground font-normal">
              Anggota Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">
                {safeStats.activeMembers}
              </span>
              <span className="text-muted-foreground font-medium">entitas</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6 pt-6">
        <h2 className="section-header">Komposisi Material</h2>
        <div className="flex flex-col gap-4">
          {breakdownLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-4 items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))
          ) : breakdown.length === 0 ? (
            <div className="text-muted-foreground text-sm py-4 border-t border-border">
              Belum ada data material tercatat.
            </div>
          ) : (
            breakdown.map((item) => (
              <div key={item.categoryId} className="flex flex-col gap-2">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">
                      {item.totalWeight.toLocaleString("id-ID")} kg
                    </span>
                    <Badge variant="secondary" className="w-12 justify-center">
                      {item.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={item.percentage} className="h-1.5" />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
