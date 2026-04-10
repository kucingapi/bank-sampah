import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/query-client';
import { ThemeProvider } from '@/shared/context/theme-context';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { OverviewPage } from '@/pages/overview';
import { EventsCalendarPage } from '@/pages/events-calendar';
import { EventDetailsPage } from '@/pages/event-details';
import { EventEntryPage } from '@/pages/event-entry';
import { VendorReportPage } from '@/pages/vendor-report';
import { MemberDirectoryPage } from '@/pages/member-directory';
import { MemberPaymentPage } from '@/pages/member-payment';
import { CategoriesPage } from '@/pages/categories';
import { VendorsPage } from '@/pages/vendors';



export function App() {
  const [activeView, setActiveView] = useState('overview');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);

  useEffect(() => {
    const handleNav = (e: CustomEvent) => {
      setActiveView(e.detail.view);
      if (e.detail.eventId) setActiveEventId(e.detail.eventId);
      if (e.detail.depositId) setActiveDepositId(e.detail.depositId);
    };
    window.addEventListener('navigate' as any, handleNav);
    return () => window.removeEventListener('navigate' as any, handleNav);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'overview': return <OverviewPage />;
      case 'calendar': return <EventsCalendarPage />;
      case 'event-details': return activeEventId ? <EventDetailsPage eventId={activeEventId} /> : <div className="p-12">Sesi Tidak Valid</div>;
      case 'event-entry': return activeEventId ? <EventEntryPage eventId={activeEventId} depositId={activeDepositId} /> : <div className="p-12">Sesi Tidak Valid</div>;
      case 'members':
      case 'member-directory': return <MemberDirectoryPage />;
      case 'members-payment': return <MemberPaymentPage />;
      case 'categories': return <CategoriesPage />;
      case 'vendors': return <VendorsPage />;
      case 'vendor-report': return activeEventId ? <VendorReportPage eventId={activeEventId} /> : <div className="p-12">Sesi Tidak Valid</div>;

      default: return <OverviewPage />;
    }
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="flex bg-background min-h-screen text-foreground font-sans antialiased">
          <Sidebar activeView={activeView} onNavigate={setActiveView} />
          <main className="flex-1 ml-64 overflow-y-auto min-h-screen transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            {renderView()}
          </main>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
