import PostHog from 'posthog-react-native';

export type AnalyticsClient = { capture(name: string, props: Record<string, unknown>): void };

/** PostHog ayarları: ekran ve dokunma kayıtları açılmaz; yalnızca açık olaylar gönderilir. */
export const POSTHOG_OPTIONS = { captureAppLifecycleEvents: true, enableSessionReplay: false } as const;

/** Native: PostHog doğrudan yüklenir (web için `analyticsClient.web.ts`). */
export function createAnalyticsClient(key: string, host: string): AnalyticsClient {
  const client = new PostHog(key, { host, ...POSTHOG_OPTIONS });
  return { capture: (name, props) => client.capture(name, props as never) };
}
