import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ json, platform, cacheControl }) => {

    // Cache for 4.5 minutes (270 seconds)
    cacheControl({
        public: true,
        maxAge: 270,
        sMaxAge: 270,
        staleWhileRevalidate: 30
    });

    console.log('Fetching weather data...');
    const url = `http://api.weatherapi.com/v1/current.json?key=${platform.env.WEATHER_API_KEY}&q=Vackelsang, Sweden&aqi=yes`;
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