import { component$ } from '@builder.io/qwik';

const emojiKey = [
    { emoji: "🏠", label: "Featured Activity"},
    { emoji: "📅", label: "Other Activity"},
    { emoji: "🎬", label: "Bertilsson"},
    { emoji: "🪩", label: "Bruinen TV"},
    { emoji: "♟️", label: "Isengard"},
    { emoji: "🎼", label: "Johansson"},
    { emoji: "📊", label: "Meeting Room"},
    { emoji: "🛋️", label: "Sirannon TV"},
];

export const CalendarEmojiKey = component$(() => (
    <div class="bg-[--color-base-1] rounded-lg shadow p-1 flex flex-col items-center gap-0.5 max-w-xs mx-auto text-xs m-1">
        <h2 class="text-xs font-semibold mb-0.5 flex items-center gap-1 text-[--color-text-0]">
            Calendar Emoji Key
        </h2>
        <div class="flex flex-col gap-0 w-full">
            {emojiKey.map(({ emoji, label }) => (
                <div class="flex items-center gap-0.5 w-full px-0.5 py-[1px]" key={emoji}>
                    <span class="text-[15px]">{emoji}</span>
                    <span class="text-[--color-text-3] text-[11px]">{label}</span>
                </div>
            ))}
        </div>
        <div class="mt-0.5 text-center text-[--color-text-2] text-[8px] leading-tight">
            Calendar emojis show where activities are.
        </div>
    </div>
));