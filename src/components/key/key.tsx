import { component$ } from '@builder.io/qwik';
import { LOCATIONS } from '../calendar/utils';

export const CalendarEmojiKey = component$(() => (
    <div class="bg-[--color-base-1] rounded-lg shadow p-1 flex flex-col items-center gap-0.5 max-w-xs mx-auto text-[11px] leading-4 m-1">
        <h2 class="text-[11px] leading-4 font-semibold mb-0.5 flex items-center gap-1 text-[--color-text-0]">
            Calendar Emoji Key
        </h2>
        <div class="flex flex-col gap-0 w-full">
            {Object.values(LOCATIONS).map(({ emoji, label, color }) => (
                <div class="flex items-center gap-1 w-full px-0.5 py-[1px]" key={label}>
                    <span class="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                    <span class="text-[14px]">{emoji}</span>
                    <span class="text-[--color-text-3] text-[10px]">{label}</span>
                </div>
            ))}
        </div>
        <div class="mt-0.5 text-center text-[--color-text-2] text-[7px] leading-tight">
            Calendar emojis show where activities are.
        </div>
    </div>
));
