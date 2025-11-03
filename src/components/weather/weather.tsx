import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

export const WeatherWidget = component$(() => {
  const data = useSignal<any>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    const repeat = async () => {
      const res = await fetch('/api/weather');
      if (!res.ok) {
        console.error('Failed to fetch weather data');
        return;
      }
      data.value = await res.json();
      setTimeout(repeat, 10 * 60 * 1000);
    };
    repeat();
  });

  return (
    <div class="bg-[--color-base-1] rounded-lg shadow p-1 flex flex-col items-center gap-1 max-w-xs mx-auto text-xs m-1">
      {data.value && (
        <>
          <h2 class="text-xs font-semibold mb-1 flex items-center gap-1 text-[--color-text-0]">
            Weather
          </h2>
          <div class="flex items-center gap-2 w-full justify-center">
            <img
              src={data.value.current.condition.icon}
              alt={data.value.current.condition.text}
              width={28}
              height={28}
              class="flex-shrink-0 drop-shadow self-center" // <-- Added self-center
              style={{ marginTop: '2px', marginBottom: '2px' }} // Optional: fine-tune vertical alignment
            />
            <div class="flex flex-col items-start justify-center leading-tight">
              <span class="text-lg font-bold text-[--color-text-0] leading-none">
                {data.value.current.temp_c}°
                <span class="text-xs font-normal text-[--color-text-2] align-top">C</span>
              </span>
              <span class="text-[10px] text-[--color-text-3]">{data.value.current.temp_f}°F</span>
            </div>
          </div>
          <div class="text-[11px] text-[--color-text-2] text-center w-full">
            {data.value.current.condition.text}
          </div>
        </>
      )}
    </div>
  );
});