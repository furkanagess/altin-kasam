import { darkColors, lightColors } from '@/src/core/theme/colors';
import { webInteractionCss } from '@/src/core/theme/web/interaction';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { ReactNode } from 'react';

/** Sunucu çıktısında stil ve istemci betikleri `headNodes` / `bodyNodes` ile eklenir; çıkarılırsa sayfa hydrate olmaz. */
export default function Root({ children }: { children: ReactNode }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    // `data-theme` hydrate'ten önce tema betiğince eklenir; bu fark bilinçlidir.
    <html lang="tr" suppressHydrationWarning {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={lightColors.surface.canvas} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={darkColors.surface.canvas} />
        {/* Kayıtlı tema tercihi ilk boyamadan önce uygulanır; koyu temada açık renk parlaması olmaz. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: documentStyles + webInteractionCss }} />
        {headNodes}
        {/* Varsayılan başlık sayfaya özel başlıktan (`generateMetadata`) sonra gelir; tarayıcı ilkini kullanır. */}
        <title>Altın Kasam</title>
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

/** `ThemeProvider` ile aynı anahtar; değer JSON metnidir ("dark" / "light" / "system"). */
const themeBootstrap = `
try {
  var p = JSON.parse(localStorage.getItem('altin_kasam_theme_v1') || 'null');
  if (p === 'light' || p === 'dark') document.documentElement.dataset.theme = p;
} catch (e) {}
`;

/**
 * Belge zemini temayı izler: sistem tercihi varsayılandır, `data-theme` (kullanıcının uygulamadaki
 * seçimi) onu ezer. Kaydırma sonu ve yükleme anı uygulama zeminiyle aynı renkte kalır.
 */
const documentStyles = `
:root { color-scheme: light; --app-canvas: ${lightColors.surface.canvas}; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { color-scheme: dark; --app-canvas: ${darkColors.surface.canvas}; }
}
:root[data-theme="dark"] { color-scheme: dark; --app-canvas: ${darkColors.surface.canvas}; }
html, body { background-color: var(--app-canvas); }
/* Uygulama gerçek temayla çizilene kadar gizli (ThemeProvider \`data-ready\` ekler). JS çalışmazsa
   içerik en geç 1,5 sn sonra yine görünür. */
:root:not([data-ready]) #root { opacity: 0; animation: app-reveal 0s linear 1.5s forwards; }
@keyframes app-reveal { to { opacity: 1; } }
`;
