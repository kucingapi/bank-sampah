import { Skeleton } from "@/shared/ui/ui/skeleton"

export function CalendarGridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-px bg-[#1A1A1A]/10 border border-[#1A1A1A]/10 rounded-lg overflow-hidden">
      {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
        <div
          key={day}
          className="bg-[#F9F9F8] p-4 text-center"
        >
          <Skeleton className="h-4 w-8 mx-auto" />
        </div>
      ))}
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="bg-[#F9F9F8] p-4 min-h-[120px] flex flex-col items-start justify-between">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-16 mt-4" />
        </div>
      ))}
    </div>
  )
}
