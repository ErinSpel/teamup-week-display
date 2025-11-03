import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ platform, redirect }) => {
    const id = platform.env?.PUBLIC_TEAMUP_CALENDAR_ID;
    if (id) {
        throw redirect(302, `https://teamup.com/${id}`);
    }
}