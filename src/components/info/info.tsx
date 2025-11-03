import { component$ } from '@builder.io/qwik';
import { TeamupCalRedirectQrcode } from '../svg/teamup-cal-redirect-qrcode';
import { SpelkollektivetWifiQrcode } from '../svg/spelkollektivet-wifi-qrcode';

interface InfoWidgetProps {
    MOTD?: string
}

const qrItems = [
    {
        label: 'Scan for booking calendar',
        QrComponent: TeamupCalRedirectQrcode,
    },
    {
        label: 'Scan to join the WiFi',
        QrComponent: SpelkollektivetWifiQrcode,
    },
];

export const InfoWidget = component$<InfoWidgetProps>(({ MOTD }) => (
    <div class="bg-[--color-base-1] rounded-lg shadow p-2 flex flex-col items-center gap-2 max-w-xs mx-auto text-xs m-1">
        <h2 class="text-xs font-semibold mb-1 flex items-center gap-1 text-[--color-text-0]">
            Information
          </h2>
        <div class="flex flex-col gap-2 w-full">
            {qrItems.map(({ label, QrComponent }) => (
                <div class="flex items-center justify-between w-full bg-[--color-base-2] rounded-lg p-1 shadow" key={label}>
                    <span class="text-[--color-text-2]">{label}</span>
                    <div class="w-12 h-12 flex items-center justify-center aspect-square">
                        <QrComponent class="w-[90%] h-[90%] object-contain rounded-md ml-1" />
                    </div>
                </div>
            ))}
        </div>
        {MOTD && (
            <div class="mt-1 text-center text-[--color-text-2]">{MOTD}</div>
        )}
    </div>
));