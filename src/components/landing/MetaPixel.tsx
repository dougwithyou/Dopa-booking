import Script from 'next/script';

export interface PixelEvent {
  name: string;
  params?: Record<string, string | number | string[]>;
  /** Meta deduplicates events sharing an eventID (e.g. the booking id). */
  eventId?: string;
  /** Fire at most once per browser session for this key (sessionStorage). */
  onceKey?: string;
}

/**
 * Meta Pixel base code + a PageView, plus any extra standard events
 * (InitiateCheckout on the booking flow, Purchase after payment). Renders
 * nothing without a pixel id. Values are JSON-encoded, never interpolated
 * raw into the script.
 */
export function MetaPixel({ pixelId, events = [] }: { pixelId: string | null; events?: PixelEvent[] }) {
  if (!pixelId || !/^\d{5,20}$/.test(pixelId)) return null;
  const tracked = events
    .map((e) => {
      const call = `fbq('track', ${JSON.stringify(e.name)}, ${JSON.stringify(e.params ?? {})}${
        e.eventId ? `, { eventID: ${JSON.stringify(e.eventId)} }` : ''
      });`;
      if (!e.onceKey) return call;
      const key = JSON.stringify(`dopa_px_${e.onceKey}`);
      return `try { if (!sessionStorage.getItem(${key})) { sessionStorage.setItem(${key}, '1'); ${call} } } catch (_) { ${call} }`;
    })
    .join('\n');

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', ${JSON.stringify(pixelId)});
          fbq('track', 'PageView');
          ${tracked}
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
