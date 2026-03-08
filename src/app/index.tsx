import { useState, useEffect } from 'react';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { OverviewPage } from '@/pages/overview';
import { EventsCalendarPage } from '@/pages/events-calendar';
import { EventDetailsPage } from '@/pages/event-details';
import { EventEntryPage } from '@/pages/event-entry';
import { VendorReportPage } from '@/pages/vendor-report';
import { MembersPage } from '@/pages/members';
import { CategoriesPage } from '@/pages/categories';

const SettingsPage = () => <div className="p-12"><h2 className="section-header">Settings</h2></div>;

export function App() {
  const [activeView, setActiveView] = useState('overview');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  useEffect(() => {
    const handleNav = (e: CustomEvent) => {
      setActiveView(e.detail.view);
      if (e.detail.eventId) setActiveEventId(e.detail.eventId);
    };
    window.addEventListener('navigate' as any, handleNav);
    return () => window.removeEventListener('navigate' as any, handleNav);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'overview': return <OverviewPage />;
      case 'calendar': return <EventsCalendarPage />;
      case 'event-details': return activeEventId ? <EventDetailsPage eventId={activeEventId} /> : <div className="p-12">Invalid Session</div>;
      case 'event-entry': return activeEventId ? <EventEntryPage eventId={activeEventId} /> : <div className="p-12">Invalid Session</div>;
      case 'members': return <MembersPage />;
      case 'categories': return <CategoriesPage />;
      case 'vendor-report': return activeEventId ? <VendorReportPage eventId={activeEventId} /> : <div className="p-12">Invalid Session</div>;
      case 'settings': return <SettingsPage />;
      default: return <OverviewPage />;
    }
  };

  return (
    <div className="flex bg-[#F9F9F8] min-h-screen text-[#1A1A1A] font-sans antialiased">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="flex-1 ml-64 overflow-y-auto min-h-screen transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
        {renderView()}
      </main>
    </div>
  );
}
