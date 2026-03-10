import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useEvents, useCreateEvent, useActiveEvent } from "@/entities/event/api/hooks"
import type { Event } from "@/entities/event/model/types"
import { Button } from "@/shared/ui/ui/button"
import { Badge } from "@/shared/ui/ui/badge"
import { Skeleton } from "@/shared/ui/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/ui/alert-dialog"

function EventsCalendarPageSkeleton() {
  return (
    <div className="p-12 max-w-5xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border border-[#1A1A1A]/20 rounded-full">
          <Skeleton className="size-6" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="size-6" />
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px bg-[#1A1A1A]/10 border border-[#1A1A1A]/10 rounded-lg overflow-hidden">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
          <div
            key={day}
            className="bg-[#F9F9F8] p-4 text-center"
          >
            <Skeleton className="h-4 w-6 mx-auto" />
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="bg-[#F9F9F8] p-4 min-h-[120px] flex flex-col items-start justify-between">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-5 w-16 mt-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function EventsCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1))
  const [loadingDay, setLoadingDay] = useState<string | null>(null)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const { data: events = [], isLoading } = useEvents()
  const createEvent = useCreateEvent()
  const activeEvent = useActiveEvent()

  const todayStr = new Date().toLocaleDateString("en-CA")

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate()
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay()

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    )
  }

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    )
  }

  const handleDateClick = async (day: number) => {
    const clickedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    )
    const dateStr = clickedDate.toLocaleDateString("en-CA")

    const existingEvent = events.find((e: Event) =>
      e.event_date.startsWith(dateStr)
    )

    if (existingEvent) {
      const navEvent = new CustomEvent("navigate", {
        detail: { view: "event-details", eventId: existingEvent.id },
      })
      window.dispatchEvent(navEvent)
    } else if (activeEvent) {
      setConflictDialogOpen(true)
    } else {
      setLoadingDay(dateStr)
      try {
        const newEvent = await createEvent.mutateAsync(dateStr)
        const navEvent = new CustomEvent("navigate", {
          detail: { view: "event-details", eventId: newEvent.id },
        })
        window.dispatchEvent(navEvent)
      } catch (err) {
        console.error("Failed to create session", err)
      } finally {
        setLoadingDay(null)
      }
    }
  }

  const handleNavigateToActiveSession = () => {
    if (activeEvent) {
      const navEvent = new CustomEvent("navigate", {
        detail: { view: "event-details", eventId: activeEvent.id },
      })
      window.dispatchEvent(navEvent)
    }
    setConflictDialogOpen(false)
  }

  if (isLoading) {
    return <EventsCalendarPageSkeleton />
  }

  return (
    <div className="p-12 max-w-5xl mx-auto flex flex-col gap-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-[#1A1A1A]">
            Jadwal <span className="text-[#1A1A1A]/40">Penyetoran</span>
          </h1>
          <p className="mt-4 text-[#1A1A1A]/50 text-sm">
            Kalender operasional dan daftar sesi aktif.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 border border-[#1A1A1A]/20 rounded-full font-medium text-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="size-6"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="w-32 text-center">
              {currentDate.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="size-6"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px bg-[#1A1A1A]/10 border border-[#1A1A1A]/10 rounded-lg overflow-hidden">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
          <div
            key={day}
            className="bg-[#F9F9F8] p-4 text-center micro-label text-[#1A1A1A]/50"
          >
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-[#F9F9F8]/50 p-4 min-h-[120px]" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            day
          ).toLocaleDateString("en-CA")
          const dayEvent = events.find((e: Event) =>
            e.event_date.startsWith(dateStr)
          )
          const isToday = dateStr === todayStr
          const isLoading = loadingDay === dateStr

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isLoading}
              className={cn(
                "group bg-[#F9F9F8] p-4 min-h-[120px] flex flex-col items-start justify-between hover:bg-[#1A1A1A]/[0.02] transition-colors text-left relative",
                isLoading && "cursor-wait"
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  isToday
                    ? "size-8 rounded-full bg-[#1A1A1A] text-[#F9F9F8] flex items-center justify-center -ml-1.5 -mt-1.5"
                    : "text-[#1A1A1A]/60"
                )}
              >
                {day}
              </span>

              {isLoading ? (
                <div className="w-full mt-4">
                  <Skeleton className="h-4 w-20 animate-pulse" />
                </div>
              ) : dayEvent ? (
                <div className="w-full flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    {dayEvent.status === "active" ? (
                      <span className="relative flex size-3">
                        <span className="animate-ping absolute inline-flex size-full rounded-full bg-[#1A1A1A] opacity-20" />
                        <span className="relative inline-flex rounded-full size-3 bg-[#F9F9F8] border-2 border-[#1A1A1A]" />
                      </span>
                    ) : (
                      <span className="size-2 rounded-full bg-[#1A1A1A]" />
                    )}
                    <Badge
                      variant={dayEvent.status === "active" ? "default" : "secondary"}
                      className="text-xs uppercase tracking-wider"
                    >
                      {dayEvent.status === "active" ? "AKTIF" : "SELESAI"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="w-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mt-4 text-[#1A1A1A]/40 text-xs font-medium uppercase tracking-wider">
                  <Plus className="size-3" /> Buka Sesi
                </div>
              )}
            </button>
          )
        })}
      </div>

      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <AlertDialogContent className="bg-[#F9F9F8] border-[#1A1A1A]/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1A1A1A]">Sesi Masih Aktif</AlertDialogTitle>
            <AlertDialogDescription className="text-[#1A1A1A]/60">
              Ada sesi aktif pada{' '}
              <span className="font-medium text-[#1A1A1A]">
                {activeEvent?.event_date
                  ? new Date(activeEvent.event_date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'tanggal ini'}
              </span>
              . Apakah Anda ingin membuka sesi yang sudah ada atau membuat sesi baru?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#1A1A1A]/5">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleNavigateToActiveSession}
              className="bg-[#1A1A1A] text-[#F9F9F8] hover:bg-[#1A1A1A]/90"
            >
              Pergi ke Sesi Aktif
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
