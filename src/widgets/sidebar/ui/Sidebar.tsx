import { LayoutDashboard, Users, Tags, Calendar, FileText, Settings, Circle } from 'lucide-react';
import { APP_NAME } from '@/shared/config';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'calendar', icon: Calendar, label: 'Sessions & Events' },
    { id: 'members', icon: Users, label: 'Members Directory' },
    { id: 'categories', icon: Tags, label: 'Category Schema' },
    { id: 'reports', icon: FileText, label: 'Vendor Manifests' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="w-64 bg-[#F9F9F8] border-r border-[#1A1A1A]/10 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-8 pb-12">
        <h1 className="text-xl font-medium tracking-tight text-[#1A1A1A] flex items-center gap-3">
          <Circle className="w-4 h-4 fill-[#1A1A1A]" />
          {APP_NAME}
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id || 
            (activeView === 'event-details' && item.id === 'calendar') ||
            (activeView === 'event-entry' && item.id === 'calendar') ||
            (activeView === 'vendor-report' && item.id === 'calendar');
            
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isActive 
                  ? 'text-[#1A1A1A] font-medium bg-[#1A1A1A]/5' 
                  : 'text-[#1A1A1A]/50 hover:bg-[#1A1A1A]/[0.02] hover:text-[#1A1A1A]/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      
      <div className="p-6 border-t border-[#1A1A1A]/10">
        <div className="flex flex-col gap-2 relative">
          <p className="micro-label text-[#1A1A1A]/50">Next Session</p>
          <p className="text-sm font-medium text-[#1A1A1A]">Sun, 10 Mar 2026</p>
          <button className="btn-primary mt-4 w-full">
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
