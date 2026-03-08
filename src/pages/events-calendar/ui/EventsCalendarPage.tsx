import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { listEvents, createEvent } from '@/entities/event/api/queries';
import type { Event } from '@/entities/event/model/types';

export function EventsCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // Start at March 2026 per original
  const [events, setEvents] = useState<Event[]>([]);
  const fetchEvents = async () => {
    try {
      const data = await listEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = async (day: number) => {
    // Construct local date string correctly YYYY-MM-DD
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = clickedDate.toLocaleDateString('en-CA'); // Gets YYYY-MM-DD format universally

    // Check if event already exists
    const existingEvent = events.find((e: Event) => e.event_date.startsWith(dateStr));
    
    if (existingEvent) {
      // Navigate to event details (Routing will be handled by parent state later, we'll dispatch an event or use a prop context)
      // For now, in this pure component we dispatch a custom event that App.tsx can listen to
      const navEvent = new CustomEvent('navigate', { detail: { view: 'event-details', eventId: existingEvent.id } });
      window.dispatchEvent(navEvent);
    } else {
      // Create new event
      try {
        const newEvent = await createEvent(dateStr);
        setEvents([...events, newEvent]);
        const navEvent = new CustomEvent('navigate', { detail: { view: 'event-details', eventId: newEvent.id } });
        window.dispatchEvent(navEvent);
      } catch (err) {
        console.error("Failed to create session", err);
      }
    }
  };

  return (
    <div className="p-12 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 ease-editorial">
      <header className="flex items-end justify-between border-b border-[#1A1A1A]/10 pb-6">
        <div>
          <h1 className="page-title text-[#1A1A1A]">
            Jadwal <span className="text-[#1A1A1A]/40">Penyetoran</span>
          </h1>
          <p className="mt-4 text-[#1A1A1A]/50 text-sm">Kalender operasional dan daftar sesi aktif.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 border border-[#1A1A1A]/20 rounded-full font-medium text-sm">
            <button onClick={handlePrevMonth} className="hover:text-[#1A1A1A]/50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="w-32 text-center">
              {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNextMonth} className="hover:text-[#1A1A1A]/50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px bg-[#1A1A1A]/10 border border-[#1A1A1A]/10 rounded-lg overflow-hidden">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
          <div key={day} className="bg-[#F9F9F8] p-4 text-center micro-label text-[#1A1A1A]/50">
            {day}
          </div>
        ))}
        
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-[#F9F9F8]/50 p-4 min-h-[120px]" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-CA');
          const dayEvent = events.find((e: Event) => e.event_date.startsWith(dateStr));
          const isToday = day === 14; // Mocking today to the 14th for context

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className="group bg-[#F9F9F8] p-4 min-h-[120px] flex flex-col items-start justify-between hover:bg-[#1A1A1A]/[0.02] transition-colors text-left relative"
            >
              <span className={`text-sm font-medium ${isToday ? 'w-8 h-8 rounded-full bg-[#1A1A1A] text-[#F9F9F8] flex items-center justify-center -ml-1.5 -mt-1.5' : 'text-[#1A1A1A]/60'}`}>
                {day}
              </span>
              
              {dayEvent ? (
                <div className="w-full flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    {dayEvent.status === 'active' ? (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1A1A1A] opacity-20"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F9F9F8] border-2 border-[#1A1A1A]"></span>
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[#1A1A1A]"></span>
                    )}
                    <span className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]">
                      {dayEvent.status === 'active' ? 'AKTIF' : 'SELESAI'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mt-4 text-[#1A1A1A]/40 text-xs font-medium uppercase tracking-wider">
                  <Plus className="w-3 h-3" /> Buka Sesi
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
