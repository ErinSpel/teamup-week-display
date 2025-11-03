import { component$, useSignal, useTask$, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead, type RequestHandler } from '@builder.io/qwik-city';
import { WeatherWidget } from '../components/weather/weather';
import { TimeWidget } from '../components/time/time';
import { CalendarView } from '../components/calendar/calendar-view';
import type { PlatformCloudflarePages } from '@builder.io/qwik-city/middleware/cloudflare-pages';
// import { BirthdayWidget } from './components/birthdays/birthdays';
import { InfoWidget } from '../components/info/info';
import { SpelkollektivetLogo } from '../components/svg/spelkollektivet-logo';
import { CalendarEmojiKey } from '../components/key/key';

export const onGet: RequestHandler<PlatformCloudflarePages> = async ({ cacheControl }) => {
    cacheControl({
        // Always serve a cached response by default, up to a week stale
        staleWhileRevalidate: 60 * 60 * 24 * 7,
        // Max once every 5 seconds, revalidate on the server to get a fresh version of this page
        maxAge: 5,
    });
};

export const useCalendarEnv = routeLoader$(({ platform }) => {
    if (!platform?.env) {
        throw new Error('Platform environment variables are not available');
    }
    return {
        calendarId: platform.env['PUBLIC_TEAMUP_CALENDAR_ID'],
        apiKey: platform.env['TEAMUP_API_KEY'],
    };
});

export default component$(() => {
    const currentTime = useSignal(new Date());
    const teamUpAPIResponse = useSignal<any>(null);

    useTask$(() => {
        setInterval(() => {

            teamUpAPIResponse.value = new Date();

        }, 5 * 60 * 1000);
    })

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(() => {
        setInterval(() => {
            currentTime.value = new Date();
        }, 1000);

        return;
    });

    return (
        <div class="p-2 h-[100vh] w-[100vw]">
            <div class="rounded-2xl h-full w-full flex overflow-hidden border-2 border-solid border-[--color-border-0]">
                <div class="bg-[--color-base-0] h-full w-full flex-1 p-2 border-r-2 border-solid border-[--color-border-0]">
                    <SpelkollektivetLogo class="m-2 fill-[--color-text-0]" />
                    <TimeWidget time={currentTime.value} />
                    <InfoWidget />
                    <WeatherWidget />
                    {/* <BirthdayWidget /> */}
                    <CalendarEmojiKey />
                </div>
                <div class="h-full w-full flex-7 bg-[--color-base-1]">
                    <CalendarView currentTime={currentTime.value} />
                </div>
            </div>
        </div>
    );
});

export const head: DocumentHead = {
    title: 'Spel TV Dashboard',
    meta: [
        {
            name: 'description',
            content: 'TV Dashboard with Calendar View',
        },
    ],
};