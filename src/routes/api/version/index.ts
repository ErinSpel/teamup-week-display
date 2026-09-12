import type { RequestHandler } from '@builder.io/qwik-city';

// Reports which build is currently running, so an already-open client can
// notice a new deploy went live and refresh itself. Must never be cached —
// a cached response would defeat the whole point.
export const onGet: RequestHandler = async ({ json, cacheControl }) => {
    cacheControl({ noStore: true });

    json(200, { version: __BUILD_VERSION__ });
};
