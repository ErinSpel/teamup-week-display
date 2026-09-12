import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { CalendarColumn } from './calendar-column';
import { getCurrentTimePosition, computeDayWindow, DEFAULT_DAY_WINDOW, LOCATIONS, FALLBACK_COLOR, type DayWindow } from './utils';

interface CalendarViewProps {
  currentTime: Date;
  platform?: {
    url: string;
  };
}

export const CalendarView = component$<CalendarViewProps>(({ currentTime }) => {
  const days = useSignal<Date[]>([]);
  const events = useSignal<any[]>([]);
  // Shared across all 7 columns so every day's grid lines up on the same
  // hour scale, cropped to the hours this week's events actually span.
  const dayWindow = useSignal<DayWindow>(DEFAULT_DAY_WINDOW);

  const fetchEvents = $(async () => {
    const today = new Date(currentTime);
    const yesterday = new Date(today);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    yesterday.setDate(yesterday.getDate() - 1);

    const daysArray = [today];
    for (let i = 1; i <= 6; i++) {
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + i);
      daysArray.push(nextDay);
    }
    days.value = daysArray;

    const response = await fetch(`/api/calendar-events?startDate=${yesterday.toISOString().split('T')[0]}&endDate=${in7Days.toISOString().split('T')[0]}`);

    if (!response.ok) {
      console.error('Failed to fetch calendar events');
      return;
    }

    interface CalendarEvent {
      events: {
        id: string;
        series_id: number;
        remote_id: number,
        subcalendar_id: number,
        subcalendar_ids: number[];
        all_day: boolean;
        rrule: string;
        title: string;
        who: string;
        location: string;
        notes: string;
        version: string;
        readonly: boolean,
        tz: string;
        attachments: [],
        start_dt: string;
        end_dt: string;
        ristart_dt: string;
        rsstart_dt: string;
        creation_dt: string;
        update_dt: string;
        delete_dt: null,
        signup_enabled: boolean,
        comments_enabled: boolean
      }[];
      isLoading: boolean;
      error: string | null;
    }

    const apiResponse: CalendarEvent = await response.json();

    if (!Array.isArray(apiResponse.events)) {
      console.error('API response "events" is not an array');
      return;
    }

    events.value = apiResponse.events.map(event => {
      const location = LOCATIONS[event.subcalendar_id.toString()];
      return {
        id: event.id,
        title: event.title,
        start: new Date(event.start_dt),
        end: new Date(event.end_dt),
        who: event.who,
        emoji: location?.emoji ?? "",
        subcalendar_id: event.subcalendar_id,
        color: location?.color ?? FALLBACK_COLOR,
      };
    });
    dayWindow.value = computeDayWindow(events.value);
    // console.info(events.value);

  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    fetchEvents();
    const interval = setInterval(() => fetchEvents(), 2.5 * 60 * 1000); // 2.5 minutes
    cleanup(() => clearInterval(interval));
  });

  return (
    <div class="calendar-view">
      {days.value.map((day, index) => (
        <CalendarColumn
          key={day.toISOString()}
          date={day}
          index={index}
          events={events.value.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            // Event overlaps this day if it starts before dayEnd and ends after dayStart
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            return eventStart < dayEnd && eventEnd > dayStart;
          })}
          isToday={index === 0}
          currentTimePosition={index === 0 ? getCurrentTimePosition(dayWindow.value.startHour, dayWindow.value.endHour) : null}
          loading={events.value.length === 0}
          startHour={dayWindow.value.startHour}
          endHour={dayWindow.value.endHour}
        />
      ))}
    </div>
  );
});