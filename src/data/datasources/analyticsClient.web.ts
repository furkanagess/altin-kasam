export type AnalyticsClient = { capture(name: string, props: Record<string, unknown>): void };

/** Sayfa açıldıktan bu kadar sonra yüklenir; ilk boyamayla ve veri istekleriyle yarışmaz. */
const LOAD_DELAY_MS = 3000;
const MAX_QUEUE = 100;

/**
 * Web: PostHog paketi büyüktür; ilk açılışı yavaşlatmasın diye kısa bir gecikmeyle, ayrı parça
 * olarak yüklenir. O ana kadarki olaylar kuyrukta bekler, yüklenince sırayla gönderilir.
 */
export function createAnalyticsClient(key: string, host: string): AnalyticsClient {
  const queue: [string, Record<string, unknown>][] = [];
  let ready: ((name: string, props: Record<string, unknown>) => void) | null = null;

  setTimeout(() => {
    import('posthog-react-native')
      .then(({ default: PostHog }) => {
        const client = new PostHog(key, { host, captureAppLifecycleEvents: true, enableSessionReplay: false });
        ready = (name, props) => client.capture(name, props as never);
        for (const [name, props] of queue.splice(0)) ready(name, props);
      })
      .catch(() => {
        // Analitik yüklenemezse uygulama etkilenmez; olaylar gönderilmez.
        queue.length = 0;
      });
  }, LOAD_DELAY_MS);

  return {
    capture(name, props) {
      if (ready) ready(name, props);
      else if (queue.length < MAX_QUEUE) queue.push([name, props]);
    },
  };
}
