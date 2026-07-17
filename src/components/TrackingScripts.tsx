import Script from "next/script";

type TrackingSettings = {
  metaPixelAtivo: boolean;
  metaPixelId: string | null;
  googleAnalyticsAtivo: boolean;
  googleAnalyticsId: string | null;
  googleTagManagerAtivo: boolean;
  googleTagManagerId: string | null;
  tiktokPixelAtivo: boolean;
  tiktokPixelId: string | null;
  customHeadCodeAtivo: boolean;
  customHeadCode: string | null;
};

export default function TrackingScripts({ settings }: { settings: TrackingSettings }) {
  const metaId = settings.metaPixelAtivo && /^\d{5,30}$/.test(settings.metaPixelId ?? "") ? settings.metaPixelId : null;
  const analyticsId = settings.googleAnalyticsAtivo && /^(G|UA)-[A-Z0-9-]+$/i.test(settings.googleAnalyticsId ?? "") ? settings.googleAnalyticsId : null;
  const tagManagerId = settings.googleTagManagerAtivo && /^GTM-[A-Z0-9]+$/i.test(settings.googleTagManagerId ?? "") ? settings.googleTagManagerId : null;
  const tiktokId = settings.tiktokPixelAtivo && /^[A-Z0-9]{8,40}$/i.test(settings.tiktokPixelId ?? "") ? settings.tiktokPixelId : null;
  const customCode = settings.customHeadCodeAtivo && settings.customHeadCode && !/<\/?script\b/i.test(settings.customHeadCode) ? settings.customHeadCode : null;

  return <>
    {analyticsId ? <><Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`} strategy="afterInteractive" /><Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${analyticsId}');`}</Script></> : null}
    {tagManagerId ? <><Script id="google-tag-manager" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${tagManagerId}');`}</Script><noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(tagManagerId)}`} height="0" width="0" className="hidden invisible" title="Google Tag Manager" /></noscript></> : null}
    {metaId ? <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaId}');fbq('track','PageView');`}</Script> : null}
    {tiktokId ? <Script id="tiktok-pixel" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i='https://analytics.tiktok.com/i18n/pixel/events.js',o=d.createElement('script');o.type='text/javascript';o.async=!0;o.src=i+'?sdkid='+e+'&lib='+t;var a=d.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)};ttq.load('${tiktokId}');ttq.page()}(window,document,'ttq');`}</Script> : null}
    {customCode ? <Script id="store-custom-head-code" strategy="afterInteractive">{customCode}</Script> : null}
  </>;
}
