import Script from 'next/script';

/**
 * Fires the Meta Pixel base code + a Purchase event when a pixel id is
 * available. This page can't read the booking row (see upsell page notes),
 * so it only fires when a `?pixel=` param is present on the URL — nothing
 * in the current shared contract threads the landing page's pixel id
 * through Stripe's success_url, so in practice this is inert until that
 * plumbing exists. Left in place rather than skipped so it activates for
 * free once that follow-up lands.
 */
export function PurchasePixel({ pixelId, bookingId }: { pixelId: string; bookingId: string }) {
  return (
    <Script id="meta-pixel-purchase" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'Purchase', { content_ids: ['${bookingId}'], content_type: 'booking' });
      `}
    </Script>
  );
}
