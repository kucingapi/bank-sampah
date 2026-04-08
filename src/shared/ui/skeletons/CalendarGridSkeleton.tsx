import { Skeleton } from "@/shared/ui/ui/skeleton"

export function CalendarGridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden">
      {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
        <div
          key={day}
          className="bg-muted p-4 text-center"
        >
          <Skeleton className="h-4 w-8 mx-auto" />
        </div>
      ))}
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="bg-muted p-4 min-h-[120px] flex flex-col items-start justify-between">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-16 mt-4" />
        </div>
      ))}
    </div>
  )
}
