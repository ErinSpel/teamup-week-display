import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ query, json, platform, cacheControl }) => {
    const startDate = query.get('startDate');
    const endDate = query.get('endDate');

    if (!platform.env.PUBLIC_TEAMUP_CALENDAR_ID || !platform.env.TEAMUP_API_KEY) {
        json(500, { error: 'Missing calendar configuration' });
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

    // Allow a forced-refresh query param to bypass caching when immediate fresh data is required.
    const forceRefresh = query.get('forceRefresh') === '1' || query.get('refresh') === '1';

    // Shorten cache window to get fresher data by default.
    // If a client specifies forceRefresh=1, bypass cache (maxAge 0).
    if (forceRefresh) {
        cacheControl({
            public: false,
            maxAge: 0,
            sMaxAge: 0,
            staleWhileRevalidate: 0
        });
    } else {
        // Cache for 30 seconds and allow brief staleWhileRevalidate to reduce load.
        cacheControl({
            public: true,
            maxAge: 30,
            sMaxAge: 30,
            staleWhileRevalidate: 10
        });
    }

    console.log('Fetching calendar events from Teamup API...');
    const url = `https://api.teamup.com/${platform.env.PUBLIC_TEAMUP_CALENDAR_ID}/events?startDate=${startDate}&endDate=${endDate}`;
    const response = await fetch(url, {
        headers: {
            'Teamup-Token': platform.env.TEAMUP_API_KEY,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        json(response.status, { error: 'Failed to fetch calendar events' });
        return;
    }

    const data: CalendarEvent = await response.json();
    const subcalendar_id: Record<number, string> = {
        13224130: "🏠",
        13225724: "📅",
        // 9546911: "🎬",
        // 9546906: "🪩",
        // 13231308: "♟️",
        // 10589925: "🎼",
        // 9546899: "📊",
        // 11510556: "🛋️",
    };

    // Only return events in subcalendar_ids or subcalendar_id that are in the subcalendar_id map
    data.events = data.events.filter((event: any) => {
        // Check array of subcalendar_ids
        if (Array.isArray(event.subcalendar_ids) && event.subcalendar_ids.length > 0) {
            return event.subcalendar_ids.some((id: number) => subcalendar_id[id]);
        }
        // Fallback: check single subcalendar_id
        if (event.subcalendar_id && subcalendar_id[event.subcalendar_id]) {
            return true;
        }
        return false;
    });

    json(200, data);
    return;
}