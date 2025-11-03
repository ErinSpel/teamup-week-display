import { component$ } from '@builder.io/qwik';
import { formatDate } from './utils';
import type { PlatformCloudflarePages } from '@builder.io/qwik-city/middleware/cloudflare-pages';

interface CalendarColumnProps {
  date: Date;
  events: any[];
  isToday: boolean;
  currentTimePosition: number | null;
  index: number;
  platform?: PlatformCloudflarePages;
  loading?: boolean; // <-- Add loading prop
}


// Helper to group overlapping events and assign columns
function getEventColumns(events: any[]) {
  // Sort by start time, then by duration descending (longest first)
  const sorted = [...events].sort((a, b) => {
    if (a.start.getTime() !== b.start.getTime()) {
      return a.start.getTime() - b.start.getTime();
    }
    // Longest first if same start
    return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
  });

  const columns: any[][] = [];
  const eventMeta: Record<string, { col: number; cols: number }> = {};

  sorted.forEach(event => {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      // Check if this event overlaps with the last event in this column
      const last = columns[col][columns[col].length - 1];
      if (last.end <= event.start) {
        columns[col].push(event);
        eventMeta[event.id] = { col, cols: 0 };
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([event]);
      eventMeta[event.id] = { col: columns.length - 1, cols: 0 };
    }
  });

  // For each event, count how many columns it overlaps with
  sorted.forEach(event => {
    let maxCols = 1;
    columns.forEach((colEvents, colIdx) => {
      colEvents.forEach(e => {
        if (
          (event.start < e.end && event.end > e.start) // overlap
        ) {
          maxCols = Math.max(maxCols, colIdx + 1);
        }
      });
    });
    eventMeta[event.id].cols = maxCols;
  });

  return eventMeta;
}

// Helper to split multi-day events into single-day events
function splitMultiDayEvents(events: any[], day: Date) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const splitEvents: any[] = [];
  for (const event of events) {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // If event does not overlap this day, skip
    if (eventEnd <= dayStart || eventStart >= dayEnd) continue;

    // If event is fully within the day, use as is
    if (eventStart >= dayStart && eventEnd <= dayEnd) {
      splitEvents.push(event);
    } else {
      // Split event
      const splitEvent = { ...event };
      if (eventStart < dayStart) {
        splitEvent.start = new Date(dayStart);
      }
      if (eventEnd > dayEnd) {
        splitEvent.end = new Date(dayEnd);
      }
      // If event starts before today, clamp to 00:00
      if (eventStart < dayStart) splitEvent.start = new Date(dayStart);
      // If event ends after today, clamp to 23:59:59.999
      if (eventEnd > dayEnd) splitEvent.end = new Date(dayEnd);
      splitEvents.push(splitEvent);
    }
  }
  return splitEvents;
}



export const CalendarColumn = component$<CalendarColumnProps>(({
  date,
  events,
  isToday,
  currentTimePosition,
  index,
  loading = false // <-- Default to false
}) => {

  // Split multi-day events into single-day segments for this column
  const dayEvents = splitMultiDayEvents(events, date);

  // Precompute event columns for the whole day
  const eventMeta = getEventColumns(dayEvents);

  // Calculate the start and end of the current day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const headerHeight = 50; // px, adjust if your .column-header height changes

  return (
    <div class={`flex-1 ${index != 6 ? 'border-r-2' : ''} border-solid border-[--color-border-0] flex-col ${isToday ? 'bg-[--color-base-1]' : 'bg-[--color-base-2]'}`}
    // style={index === 0 ? { flex: 2 } : { flex: 1 }}

    >

      <div class="p-2 border-b-2 border-solid border-[--color-border-0] text-[--color-text-2]">
        <div class="date">
          {isToday ? (
            <>
              <span class="text-red-400/80">Today</span> <span class="text-[13px]">({formatDate(date).toString()})</span>
            </>
          ) : (
            formatDate(date)
          )}
        </div>
      </div>
      <div class="flex-1 relative h-full" style={{ height: `calc(100vh - ${headerHeight}px)` }}>
        {/* Render time labels */}
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} class="h-[calc((100%)/24)] p-1 relative border-b-[1px] border-solid border-[--color-border-0]">
            <div class="text-[8px] text-[--color-text-2] absolute top-[50%] translate-y-[-50%]">{`${i.toString().padStart(2, '0')}:00`}</div>
          </div>
        ))}
        {/* Skeletons while loading */}
        {loading && (
          <div class="absolute inset-0 z-10 pointer-events-none flex flex-col gap-2 px-2 py-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                class="animate-pulse bg-gradient-to-r from-[--color-base-2]/60 to-[--color-base-1]/60 rounded border border-[--color-border-0] shadow-sm flex items-center gap-2"
                style={{
                  minHeight: '28px',
                  maxHeight: '36px',
                  height: `${24 + Math.random() * 16}px`,
                  width: `${85 + Math.random() * 10}%`,
                  marginTop: `${idx === 0 ? 10 : 8 + Math.random() * 10}%`,
                }}
              >
                <div class="w-5 h-5 bg-[--color-border-0]/40 rounded-full mx-2"></div>
                <div class="flex-1 h-2 bg-[--color-border-0]/40 rounded"></div>
              </div>
            ))}
          </div>
        )}
        {/* Render events absolutely over the .time-slots area */}
        {!loading && dayEvents.map(event => {
          const meta = eventMeta[event.id];

          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);

          // Calculate top and height as percentage of the day
          const startMinutes = (eventStart.getHours() * 60) + eventStart.getMinutes();
          let endMinutes;
          if (eventEnd.getTime() === dayEnd.getTime()) {
            endMinutes = 24 * 60;
          } else {
            endMinutes = (eventEnd.getHours() * 60) + eventEnd.getMinutes();
          }
          const top = (startMinutes / (24 * 60)) * 100;
          const heightPercent = ((endMinutes - startMinutes) / (24 * 60)) * 100;
          const width = `${100 / meta.cols - 1}%`;
          const left = `${(meta.col * 100) / meta.cols}%`;

          // Minimum height in pixels
          const minHeightPx = 30;

          // const emoji = event.subcalendar_id || "";

          return (
            <div
              key={event.id}
              class='absolute min-h-8 text-[--color-text-0] flex items-start justify-start text-left whitespace-normal break-words text-ellipsis overflow-hidden rounded z-[1] mx-[1px] border-[2px] border-white/30 font-semibold'
              style={{
                backgroundColor: event.color,
                width,
                left,
                top: `${top}%`,
                height: `max(${heightPercent}%, ${minHeightPx}px)`,
                minHeight: `${minHeightPx}px`,
                fontSize: '0.6rem',
              }}
            >
              <span class="text-[10px] p-[1px] block w-full h-full rounded bg-slate-900/10">
                {event.emoji && (
                  <span>
                    {event.emoji}
                  </span>
                )}
                {event.start && event.end && (
                  <span class="text-[--color-text-0] text-[8px]">
                    {`${Intl.DateTimeFormat('en-US', {
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: false,
                    }).format(event.start)}`}
                  </span>
                )}
                {event.title && (
                  <span class="text-[--color-text-0] font-semibold">
                    {` | ${event.title}`}
                  </span>
                )}
                {event.who && (
                  <span class="text-white/80 text-[8px] font-normal">
                    {` (${event.who})`}
                  </span>
                )}
                {/* {`${event.emoji} <span class="text-[10px]">${Intl.DateTimeFormat('en-US', {
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: false,
                }).format(event.start)}</span> | ${event.title}${event.who ? ` (${event.who})` : ''}`}*/}
              </span>
            </div>
          );
        })}
        {isToday && currentTimePosition !== null && (
          <div
            class="absolute left-0 right-0 h-[3px] bg-red-500 z-[2] transition-all duration-500 box-shadow-[0_0_10px_rgba(255,59,48,0.5)]"
            style={{ top: `${currentTimePosition}%` }}
          >
            <div class="absolute w-4 h-4 bg-red-500 rounded-full" style={{ top: '-6px', left: '-2px' }}></div>
          </div>
        )}
      </div>
    </div>
  );
});

// 🏠 Featured Activities
// 📅 Other Activities
// 🎬 Bertilsson
// 🪩 Bruinen TV
// ♟️ Isengard Board Game Room
// 🎼 Johansson
// 📊 Meeting Room
// 🛋️ Sirannon TV
