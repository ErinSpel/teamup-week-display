import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { CalendarColumn } from './calendar-column';
import { getCurrentTimePosition } from './utils';

interface CalendarViewProps {
  currentTime: Date;
  platform?: {
    url: string;
  };
}

export const CalendarView = component$<CalendarViewProps>(({ currentTime }) => {
  const days = useSignal<Date[]>([]);
  const events = useSignal<any[]>([]);

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

    // Emoji mapping for locations
    const locationEmoji: Record<string, string> = {
      "13224130": "🏠",
      "13225724": "📅",
      "9546911": "🎬",
      "9546906": "🪩",
      "13231308": "♟️",
      "10589925": "🎼",
      "9546899": "📊",
      "11510556": "🛋️",
    };

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

    const hashSubcalendarIdToColor = (subcalendar_id: number) => {
      if (subcalendar_id === 10589925) {
        return '#542382'; // Default color for subcalendar_id 0
      }
      const idString = subcalendar_id.toString();
      let hash = 0;
      for (let i = 0; i < idString.length; i++) {
        hash = idString.charCodeAt(i) + ((hash << 5) - hash);
      }
      // Convert hash into a hex color
      const color =
        "#" +
        ((hash >> 24) & 0xff).toString(16).padStart(2, "0") +
        ((hash >> 16) & 0xff).toString(16).padStart(2, "0") +
        ((hash >> 8) & 0xff).toString(16).padStart(2, "0");
      return color;
    };

    if (!Array.isArray(apiResponse.events)) {
      console.error('API response "events" is not an array');
      return;
    }

    events.value = apiResponse.events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_dt),
      end: new Date(event.end_dt),
      who: event.who,
      emoji: locationEmoji[event.subcalendar_id.toString()] || "",
      subcalendar_id: event.subcalendar_id,
      color: hashSubcalendarIdToColor(event.subcalendar_id),
    }));
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
          currentTimePosition={index === 0 ? getCurrentTimePosition() : null}
          loading={events.value.length === 0}
        />
      ))}
    </div>
  );
});