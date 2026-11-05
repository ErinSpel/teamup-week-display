import { component$, useSignal, useTask$, useVisibleTask$ } from '@builder.io/qwik';
import { routeLoader$, useLocation, type DocumentHead, type RequestHandler } from '@builder.io/qwik-city';
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

// Some TV browsers report a viewport bigger than the part of the panel that is
// actually visible, so the right and bottom edges of the dashboard get cut
// off. `?safe=` shrinks the dashboard into the visible part, as percentages of
// the viewport in CSS shorthand order: `?safe=3` (all sides),
// `?safe=0,10,6,0` (top, right, bottom, left), and so on.
// `?calibrate` draws numbered edge markers so you can read the values off the TV.
const MAX_SAFE_INSET = 25;

export const parseSafeInsets = (value: string | null) => {
    const parts = (value ?? '')
        .split(',')
        .map(part => Number.parseFloat(part))
        .map(n => (Number.isFinite(n) ? Math.min(Math.max(n, 0), MAX_SAFE_INSET) : 0));
    const [top = 0, right = top, bottom = top, left = right] = parts;
    return { top, right, bottom, left };
};

const CALIBRATION_STEPS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

const CalibrationOverlay = component$(() => (
    <div class="pointer-events-none fixed inset-0 z-50 font-mono text-[12px] font-bold text-white">
        {CALIBRATION_STEPS.map(step => (
            <div key={`r${step}`}>
                <div class="absolute top-0 bottom-0 w-[2px] bg-yellow-300/80" style={{ right: `${step}%` }} />
                <div class="absolute rounded bg-black/80 px-1" style={{ right: `${step}%`, top: `${20 + step * 2}%` }}>
                    {`R ${step}`}
                </div>
                <div class="absolute left-0 right-0 h-[2px] bg-cyan-300/80" style={{ bottom: `${step}%` }} />
                <div class="absolute rounded bg-black/80 px-1" style={{ bottom: `${step}%`, left: `${20 + step * 2}%` }}>
                    {`B ${step}`}
                </div>
            </div>
        ))}
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/90 p-4 text-center text-[16px] leading-snug">
            Note the smallest R and B numbers you can still read on the TV.
            <br />
            Then open the page with <span class="text-yellow-300">?safe=0,R,B,0</span>
        </div>
    </div>
));

export default component$(() => {
    const location = useLocation();
    const safe = parseSafeInsets(location.url.searchParams.get('safe'));
    const calibrate = location.url.searchParams.has('calibrate');
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

    // This tab stays open indefinitely on a TV, so it needs to notice on its
    // own when a new build has gone live and reload to pick it up.
    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ cleanup }) => {
        let knownVersion: string | null = null;

        const checkForNewDeploy = async () => {
            try {
                const response = await fetch('/api/version', { cache: 'no-store' });
                if (!response.ok) return;
                const { version } = await response.json() as { version: string };
                if (knownVersion === null) {
                    knownVersion = version;
                } else if (version !== knownVersion) {
                    window.location.reload();
                }
            } catch {
                // Network hiccup; just try again next interval.
            }
        };

        checkForNewDeploy();
        const interval = setInterval(checkForNewDeploy, 5 * 60 * 1000);
        cleanup(() => clearInterval(interval));
    });

    return (
        <div
            class="fixed p-2"
            style={{
                top: `${safe.top}vh`,
                right: `${safe.right}vw`,
                bottom: `${safe.bottom}vh`,
                left: `${safe.left}vw`,
            }}
        >
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
            {calibrate && <CalibrationOverlay />}
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