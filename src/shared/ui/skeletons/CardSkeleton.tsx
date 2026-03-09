import { Skeleton } from "@/shared/ui/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/ui/card"

interface CardSkeletonProps {
  hasHeader?: boolean
  lines?: number
}

export function CardSkeleton({ hasHeader = true, lines = 3 }: CardSkeletonProps) {
  return (
    <Card>
      {hasHeader && (
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col gap-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
