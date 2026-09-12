// One curated color per room/category instead of hashing the subcalendar_id
// into a color: a hash can (and did) put two different rooms at the exact
// same color, and gives no guarantee of readable contrast against the white
// event text. Every value below is checked to hold at least a 4.5:1 contrast
// ratio against white. Shared by the calendar view (to color event chips) and
// the emoji key (to show the swatch each label actually corresponds to).
export interface Location {
  emoji: string;
  label: string;
  color: string;
}

export const LOCATIONS: Record<string, Location> = {
  "13224130": { emoji: "🏠", label: "Featured Activity", color: "#c0293f" },
  "13225724": { emoji: "📅", label: "Other Activity", color: "#b5590f" },
  "9546911": { emoji: "🎬", label: "Bertilsson", color: "#7e3fc9" },
  "9546906": { emoji: "🪩", label: "Bruinen TV", color: "#c22a86" },
  "13231308": { emoji: "♟️", label: "Isengard", color: "#127a82" },
  "10589925": { emoji: "🎼", label: "Johansson", color: "#3d55c9" },
  "9546899": { emoji: "📊", label: "Meeting Room", color: "#55606e" },
  "11510556": { emoji: "🛋️", label: "Sirannon TV", color: "#166a46" },
};
// For any subcalendar not in the map above (contrast checked the same way).
export const FALLBACK_COLOR = "#4b5563";

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const getCurrentTimePosition = (startHour: number, endHour: number): number => {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const windowStart = startHour * 60;
  const windowEnd = endHour * 60;
  const clamped = Math.min(Math.max(totalMinutes, windowStart), windowEnd);
  const percentage = ((clamped - windowStart) / (windowEnd - windowStart)) * 100;
  return Math.round(percentage);
};

export interface DayWindow {
  startHour: number;
  endHour: number;
}

// Used when there's no event data yet to size the grid from (initial render,
// or a genuinely empty week).
export const DEFAULT_DAY_WINDOW: DayWindow = { startHour: 7, endHour: 23 };

// Crop the 24-hour grid down to the hours this week's events actually span
// (plus a little padding), so a quiet 00:00-08:00 stretch doesn't eat vertical
// space every event box could otherwise use.
export const computeDayWindow = (events: { start: Date; end: Date }[]): DayWindow => {
  if (events.length === 0) return DEFAULT_DAY_WINDOW;

  let earliestStart = 24 * 60;
  let latestEnd = 0;
  for (const event of events) {
    const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
    let endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
    if (endMinutes <= startMinutes) endMinutes = 24 * 60; // runs to (or past) midnight
    earliestStart = Math.min(earliestStart, startMinutes);
    latestEnd = Math.max(latestEnd, endMinutes);
  }

  const paddingMinutes = 60;
  let startHour = Math.max(0, Math.floor((earliestStart - paddingMinutes) / 60));
  let endHour = Math.min(24, Math.ceil((latestEnd + paddingMinutes) / 60));

  // Keep a sane minimum span so a quiet week doesn't compress into a
  // handful of hours and look broken.
  const minSpanHours = 10;
  const deficit = minSpanHours - (endHour - startHour);
  if (deficit > 0) {
    startHour = Math.max(0, startHour - Math.ceil(deficit / 2));
    endHour = Math.min(24, endHour + Math.ceil(deficit / 2));
  }

  return { startHour, endHour };
};