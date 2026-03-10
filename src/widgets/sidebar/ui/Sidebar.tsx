import { LayoutDashboard, Users, Tags, Calendar, FileText, Circle, Truck } from "lucide-react"
import { APP_NAME } from "@/shared/config"
import { Button } from "@/shared/ui/ui/button"
import { cn } from "@/shared/lib/utils"
import { useActiveEvent } from "@/entities/event/api/hooks"

interface SidebarProps {
  activeView: string
  onNavigate: (view: string) => void
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const activeEvent = useActiveEvent()

  const handleActiveSessionClick = () => {
    if (activeEvent) {
      const navEvent = new CustomEvent("navigate", {
        detail: { view: "event-details", eventId: activeEvent.id },
      })
      window.dispatchEvent(navEvent)
    }
  }

  const menuItems = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "calendar", icon: Calendar, label: "Sessions & Events" },
    { id: "members", icon: Users, label: "Members Directory" },
    { id: "categories", icon: Tags, label: "Category Schema" },
    { id: "vendors", icon: Truck, label: "Vendors" },
    { id: "reports", icon: FileText, label: "Vendor Manifests" },
  ]

  return (
    <div className="w-64 bg-[#F9F9F8] border-r border-[#1A1A1A]/10 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-8 pb-12">
        <h1 className="text-xl font-medium tracking-tight text-[#1A1A1A] flex items-center gap-3">
          <Circle className="size-4 fill-[#1A1A1A]" />
          {APP_NAME}
        </h1>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive =
            activeView === item.id ||
            (activeView === "event-details" && item.id === "calendar") ||
            (activeView === "event-entry" && item.id === "calendar") ||
            (activeView === "vendor-report" && item.id === "calendar")

          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full justify-start gap-3 font-normal",
                isActive
                  ? "text-[#1A1A1A] font-medium bg-[#1A1A1A]/5"
                  : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]/80"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      {activeEvent && (
        <div className="p-4 pt-0">
          <div className="relative p-5 bg-[#1A1A1A] rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-50" />
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-white" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  Active Session
                </span>
              </div>

              <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">
                Tanggal
              </p>
              <p className="text-white text-sm font-semibold tracking-tight mb-4">
                {activeEvent.event_date
                  ? new Date(activeEvent.event_date).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'}
              </p>

              <Button
                size="sm"
                onClick={handleActiveSessionClick}
                className="w-full bg-white text-[#1A1A1A] hover:bg-white/90 font-semibold text-xs tracking-wide h-9 rounded-md"
              >
                Pergi ke Sesi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
