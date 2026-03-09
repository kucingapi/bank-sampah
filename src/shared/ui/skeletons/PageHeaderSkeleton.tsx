import { Skeleton } from "@/shared/ui/ui/skeleton"
import { Button } from "@/shared/ui/ui/button"

interface PageHeaderSkeletonProps {
  hasBackButton?: boolean
  hasActions?: boolean
}

export function PageHeaderSkeleton({ hasBackButton = false, hasActions = false }: PageHeaderSkeletonProps) {
  return (
    <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
      <div className="flex items-center gap-6">
        {hasBackButton && (
          <Button variant="ghost" size="icon" disabled className="opacity-50">
            <Skeleton className="size-5" />
          </Button>
        )}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      {hasActions && (
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      )}
    </header>
  )
}
