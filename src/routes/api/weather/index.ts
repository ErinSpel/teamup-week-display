import type { RequestHandler } from '@builder.io/qwik-city';
import { PlatformCloudflarePages } from '@builder.io/qwik-city/middleware/cloudflare-pages';

export const onGet: RequestHandler<PlatformCloudflarePages> = async ({ json, platform, cacheControl }) => {

    // Cache for 4.5 minutes (270 seconds)
    cacheControl({
        public: true,
        maxAge: 270,
        sMaxAge: 270,
        staleWhileRevalidate: 30
    });

    console.log('Fetching weather data...');

    const apiKey = platform?.env?.WEATHER_API_KEY ?? process.env.WEATHER_API_KEY;
    if (!apiKey) {
        json(500, { error: 'Missing WEATHER_API_KEY' });
        return;
    }
    const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=Vackelsang, Sweden&aqi=yes`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        json(response.status, { error: 'Failed to fetch weather data' });
        return;
    }

    const data = await response.json();
    json(200, data);
};