import { Skeleton } from "@/shared/ui/ui/skeleton"
import { Card, CardContent } from "@/shared/ui/ui/card"

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </CardContent>
    </Card>
  )
}
