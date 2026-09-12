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
  startHour?: number; // first hour of the grid (default: midnight)
  endHour?: number; // first hour past the grid's bottom edge (default: 24)
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
  loading = false, // <-- Default to false
  startHour = 0,
  endHour = 24,
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

  // The grid only covers [startHour, endHour) rather than the full day, so
  // events get cropped/scaled against that window instead of 24 hours.
  const windowStartMinutes = startHour * 60;
  const windowEndMinutes = endHour * 60;
  const windowMinutes = windowEndMinutes - windowStartMinutes;
  const hourCount = endHour - startHour;

  // Minimum height in pixels, so short events stay readable
  const minHeightPx = 30;

  // Precompute every event's rendered position up front so we can figure out,
  // for each one, the next event anywhere in the day that it could visually
  // run into (not just ones sharing its column) once its minimum-height floor
  // is applied.
  const layout = dayEvents.map(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const meta = eventMeta[event.id];

    const startMinutes = (eventStart.getHours() * 60) + eventStart.getMinutes();
    let endMinutes;
    if (eventEnd.getTime() === dayEnd.getTime()) {
      endMinutes = 24 * 60;
    } else {
      endMinutes = (eventEnd.getHours() * 60) + eventEnd.getMinutes();
    }

    // Clamp into the visible window in case an event runs outside the hours
    // the grid was sized for (e.g. a same-day edge case the padding missed).
    const clampedStart = Math.min(Math.max(startMinutes, windowStartMinutes), windowEndMinutes);
    const clampedEnd = Math.min(Math.max(endMinutes, windowStartMinutes), windowEndMinutes);

    return {
      event,
      startMinutes,
      top: ((clampedStart - windowStartMinutes) / windowMinutes) * 100,
      heightPercent: ((clampedEnd - clampedStart) / windowMinutes) * 100,
      widthPercent: 100 / meta.cols - 1,
      leftPercent: (meta.col * 100) / meta.cols,
      cols: meta.cols,
      maxHeight: undefined as string | undefined,
    };
  });

  // A box shrunk to fit a tight gap can end up too short to read at all. Below
  // this floor, prefer a small, bounded overlap into whatever comes next over
  // an illegible sliver.
  const readableMinHeightPx = 20;

  layout.forEach(entry => {
    const entryRight = entry.leftPercent + entry.widthPercent;
    let nextTop: number | null = null;
    layout.forEach(other => {
      if (other === entry || other.startMinutes <= entry.startMinutes) return;
      const otherRight = other.leftPercent + other.widthPercent;
      const horizontalOverlap = Math.min(entryRight, otherRight) - Math.max(entry.leftPercent, other.leftPercent);
      if (horizontalOverlap > 0 && (nextTop === null || other.top < nextTop)) {
        nextTop = other.top;
      }
    });
    entry.maxHeight = nextTop !== null
      ? `max(calc(${Math.max(nextTop - entry.top, 0)}% - 4px), ${readableMinHeightPx}px)`
      : undefined;
  });

  return (
    <div class={`flex-1 ${index != 6 ? 'border-r-2' : ''} border-solid border-[--color-border-0] flex-col ${isToday ? 'bg-[--color-base-1]' : 'bg-[--color-base-2]'}`}
    // style={index === 0 ? { flex: 2 } : { flex: 1 }}

    >

      <div class="p-2 border-b-2 border-solid border-[--color-border-0] text-[--color-text-2]">
        <div class="date">
          {isToday ? (
            <>
              <span class="text-red-400/80">Today</span> <span class="text-[12px]">({formatDate(date).toString()})</span>
            </>
          ) : (
            formatDate(date)
          )}
        </div>
      </div>
      <div class="flex-1 relative h-full" style={{ height: `calc(100vh - ${headerHeight}px)` }}>
        {/* Render time labels. A gridline every hour for 14+ hours reads as a
        dense ladder competing with the event chips, so only every second hour
        gets a full line; the rest get a faint tick, still one per hour. */}
        {Array.from({ length: hourCount }, (_, i) => startHour + i).map(hour => (
          <div
            key={hour}
            class={`p-1 relative border-b-[1px] border-solid ${hour % 2 === 0 ? 'border-[--color-border-0]' : 'border-[#2b2b2b]'}`}
            style={{ height: `${100 / hourCount}%` }}
          >
            <div class="text-[7px] text-[--color-text-2] absolute top-[50%] translate-y-[-50%]">{`${hour.toString().padStart(2, '0')}:00`}</div>
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
        {!loading && layout.map(({ event, top, heightPercent, leftPercent, widthPercent, cols, maxHeight }) => {
          const width = `${widthPercent}%`;
          const left = `${leftPercent}%`;

          // const emoji = event.subcalendar_id || "";

          return (
            <div
              key={event.id}
              class='absolute text-[--color-text-0] flex items-start justify-start text-left whitespace-normal break-words text-ellipsis overflow-hidden rounded z-[1] mx-[1px] border border-white/15 font-semibold'
              style={{
                backgroundColor: event.color,
                width,
                left,
                top: `${top}%`,
                height: `max(${heightPercent}%, ${minHeightPx}px)`,
                maxHeight,
                fontSize: '8.6px',
              }}
            >
              <span class="text-[9px] p-[1px] block w-full h-full rounded bg-slate-900/10">
                {event.emoji && (
                  <span>
                    {event.emoji}
                  </span>
                )}
                {event.start && event.end && (
                  <span class="text-[--color-text-0] text-[7px]">
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
                {event.who && cols < 3 && (
                  <span class="text-white/80 text-[7px] font-normal">
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
