import { useState, useEffect } from "react"
import { getDashboardStats, getCategoryBreakdown } from "../api/queries"
import type { DashboardStats, CategoryBreakdown } from "../api/queries"
import { formatCurrency } from "@/shared/lib/format"
import { Calendar, TrendingUp } from "lucide-react"
import { Button } from "@/shared/ui/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Progress } from "@/shared/ui/ui/progress"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { Badge } from "@/shared/ui/ui/badge"

export function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalWeight: 0,
    totalPayout: 0,
    activeMembers: 0,
  })
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([])
  const [loading, setLoading] = useState(true)

  const dateRangeStr = "14 Feb 2026 — 05 Mar 2026"

  useEffect(() => {
    async function fetchStats() {
      try {
        const [s, b] = await Promise.all([
          getDashboardStats(),
          getCategoryBreakdown(),
        ])
        setStats(s)
        setBreakdown(b)
      } catch (err) {
        console.error("Failed to load dashboard stats:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="p-12 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  return (
    <div className="p-12 max-w-6xl mx-auto flex flex-col gap-12">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div>
          <h1 className="page-title text-[#1A1A1A]">
            Overview <span className="text-[#1A1A1A]/40">Dasbor</span>
          </h1>
          <p className="mt-4 text-[#1A1A1A]/50 text-sm">
            Ringkasan operasional dan metrik fasilitas.
          </p>
        </div>

        <Button variant="outline" className="rounded-full">
          <Calendar className="size-4 text-[#1A1A1A]/50" />
          {dateRangeStr}
        </Button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="micro-label text-[#1A1A1A]/50 font-normal">
              Total Terkumpul
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">
                {stats.totalWeight.toLocaleString("id-ID")}
              </span>
              <span className="text-[#1A1A1A]/50 font-medium">kg</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-[#1A1A1A]" />
              <span className="font-medium">+12.5%</span>
              <span className="text-[#1A1A1A]/40">vs bulan lalu</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="micro-label text-[#1A1A1A]/50 font-normal">
              Dana Disalurkan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">
                {formatCurrency(stats.totalPayout)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-[#1A1A1A]" />
              <span className="font-medium">+8.2%</span>
              <span className="text-[#1A1A1A]/40">vs bulan lalu</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="micro-label text-[#1A1A1A]/50 font-normal">
              Anggota Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">
                {stats.activeMembers}
              </span>
              <span className="text-[#1A1A1A]/50 font-medium">entitas</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6 pt-6">
        <h2 className="section-header">Komposisi Material</h2>
        <div className="flex flex-col gap-4">
          {breakdown.length === 0 ? (
            <div className="text-[#1A1A1A]/40 text-sm py-4 border-t border-[#1A1A1A]/5">
              Belum ada data material tercatat.
            </div>
          ) : (
            breakdown.map((item) => (
              <div key={item.categoryId} className="flex flex-col gap-2">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex gap-4">
                    <span className="text-[#1A1A1A]/50">
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
