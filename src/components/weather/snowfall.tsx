import { component$ } from '@builder.io/qwik';

export type SnowIntensity = 'light' | 'moderate' | 'heavy' | 'blizzard';

// weatherapi.com condition codes that mean snow is actually falling, graded
// by how hard it is snowing. Sleet and ice pellets are left out on purpose.
// https://www.weatherapi.com/docs/weather_conditions.json
const SNOW_CODES: Record<number, SnowIntensity> = {
  1066: 'light', // Patchy snow possible
  1210: 'light', // Patchy light snow
  1213: 'light', // Light snow
  1255: 'light', // Light snow showers
  1279: 'light', // Patchy light snow with thunder
  1114: 'moderate', // Blowing snow
  1216: 'moderate', // Patchy moderate snow
  1219: 'moderate', // Moderate snow
  1222: 'heavy', // Patchy heavy snow
  1225: 'heavy', // Heavy snow
  1258: 'heavy', // Moderate or heavy snow showers
  1282: 'heavy', // Moderate or heavy snow with thunder
  1117: 'blizzard', // Blizzard
};

/** How hard it is snowing, or null when it is not snowing. */
export const snowIntensity = (
  condition?: { code?: number; text?: string } | null,
): SnowIntensity | null => {
  if (!condition) return null;
  if (typeof condition.code === 'number') return SNOW_CODES[condition.code] ?? null;
  const text = condition.text ?? '';
  if (/blizzard/i.test(text)) return 'blizzard';
  if (!/snow/i.test(text)) return null;
  if (/heavy/i.test(text)) return 'heavy';
  if (/moderate|blowing/i.test(text)) return 'moderate';
  return 'light';
};

// Even a blizzard stays sparse enough that the schedule is always readable.
// `speed` shortens each flake's cycle, `drift` scales the sideways wander.
const LEVELS: Record<SnowIntensity, { count: number; speed: number; drift: number }> = {
  light: { count: 6, speed: 1, drift: 1 },
  moderate: { count: 12, speed: 1.15, drift: 1.3 },
  heavy: { count: 20, speed: 1.35, drift: 1.6 },
  blizzard: { count: 30, speed: 1.7, drift: 3 },
};

const MAX_FLAKES = LEVELS.blizzard.count;

// Small seeded PRNG so the flake layout is the same on every render and
// on the server, and nothing changes between frames.
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const rand = mulberry32(1225);
const FLAKES = Array.from({ length: MAX_FLAKES }, () => ({
  left: rand() * 100, // vw
  size: 2 + rand() * 1.5, // px
  duration: 28 + rand() * 16, // s, each flake falls for 70% of this, then rests off screen
  phase: rand(), // how far into its cycle the flake starts
  drift: (rand() - 0.5) * 50, // px of sideways wander
  opacity: 0.3 + rand() * 0.3,
}));

/**
 * A few slow, faint flakes drifting down from the top of the viewport,
 * with more and faster flakes the harder it snows.
 * Pure CSS transform animation, so the browser can run it on the
 * compositor with no per-frame JS. Hidden for prefers-reduced-motion.
 */
export const Snowfall = component$<{ intensity: SnowIntensity }>(({ intensity }) => {
  const level = LEVELS[intensity];
  return (
    <div class="snowfall" aria-hidden="true">
      {FLAKES.slice(0, level.count).map((f, i) => {
        const duration = f.duration / level.speed;
        return (
          <span
            key={i}
            class="snowflake"
            style={{
              left: `${f.left}vw`,
              width: `${f.size}px`,
              height: `${f.size}px`,
              opacity: f.opacity,
              animationDuration: `${duration}s`,
              // Negative delay starts each flake part way through its cycle,
              // so the sky is already at its usual density when snow starts.
              animationDelay: `${-f.phase * duration}s`,
              '--snow-drift': `${f.drift * level.drift}px`,
            }}
          />
        );
      })}
    </div>
  );
});
