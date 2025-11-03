import { component$ } from '@builder.io/qwik';

interface TimeWidgetProps {
  time: Date;
}

export const TimeWidget = component$<TimeWidgetProps>(({ time }) => {
  return (
    <div class="time-widget">
      <div class="text-xl font-bold text-[--color-text-0] text-center">
        {time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })}
      </div>
      {/* <div class="text-sm text-[--color-text-2]">
        {time.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}
      </div> */}
    </div>
  );
});