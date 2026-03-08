import { LayoutDashboard, Users, Tags, Calendar, FileText, Circle } from "lucide-react"
import { APP_NAME } from "@/shared/config"
import { Button } from "@/shared/ui/ui/button"
import { cn } from "@/shared/lib/utils"

interface SidebarProps {
  activeView: string
  onNavigate: (view: string) => void
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "calendar", icon: Calendar, label: "Sessions & Events" },
    { id: "members", icon: Users, label: "Members Directory" },
    { id: "categories", icon: Tags, label: "Category Schema" },
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
    </div>
  )
}
