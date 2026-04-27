import { LayoutDashboard, Users, Tags, Calendar, Circle, Truck, Moon, Sun, Wallet, Settings } from "lucide-react"
import { APP_NAME } from "@/shared/config"
import { Button } from "@/shared/ui/ui/button"
import { ThemeSwitch } from "@/shared/ui/ui/theme-switch"
import { cn } from "@/shared/lib/utils"
import { useActiveEvent } from "@/entities/event/api/hooks"
import { useTheme } from "@/shared/context/theme-context"

interface SidebarProps {
  activeView: string
  onNavigate: (view: string) => void
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const activeEvent = useActiveEvent()
  const { theme, toggleTheme } = useTheme()

  const handleActiveSessionClick = () => {
    if (activeEvent) {
      const navEvent = new CustomEvent("navigate", {
        detail: { view: "event-details", eventId: activeEvent.id },
      })
      window.dispatchEvent(navEvent)
    }
  }

  const menuItems = [
    { id: "overview", icon: LayoutDashboard, label: "Ringkasan" },
    { id: "calendar", icon: Calendar, label: "Penyetoran" },
    { id: "members", icon: Users, label: "Anggota" },
    { id: "members-payment", icon: Wallet, label: "Pembayaran Anggota" },
    { id: "categories", icon: Tags, label: "Skema Kategori" },
    { id: "vendors", icon: Truck, label: "Vendor" },
    { id: "settings", icon: Settings, label: "Pengaturan" },
  ]

  return (
    <div className="w-64 bg-sidebar border-r border-border h-screen flex flex-col fixed left-0 top-0">
      <div className="p-8 pb-12">
        <h1 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-3">
          <Circle className="size-4 fill-foreground" />
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
            (activeView === "vendor-report" && item.id === "calendar") ||
            (activeView === "member-directory" && item.id === "members")

          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full justify-start gap-3 font-normal",
                isActive
                  ? "text-foreground font-medium bg-sidebar-accent"
                  : "text-muted-foreground hover:text-foreground"
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
          <div className="relative p-5 bg-foreground rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-50" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-primary-foreground opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-primary-foreground" />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">
                  Sesi Aktif
                </span>
              </div>

              <p className="text-primary-foreground/40 text-[11px] font-medium uppercase tracking-wider mb-1">
                Tanggal
              </p>
              <p className="text-primary-foreground text-sm font-semibold tracking-tight mb-4">
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
                className="w-full bg-primary-foreground text-foreground hover:bg-primary-foreground/90 font-semibold text-xs tracking-wide h-9 rounded-md"
              >
                Pergi ke Sesi
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground/60 mb-2">v0.2.1</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === 'light' ? (
              <Sun className="size-4 text-muted-foreground" />
            ) : (
              <Moon className="size-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {theme === 'light' ? 'Terang' : 'Gelap'}
            </span>
          </div>
          <ThemeSwitch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
          />
        </div>
      </div>
    </div>
  )
}
