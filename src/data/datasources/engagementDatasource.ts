import { storageGet, storageSet } from '@/src/core/storage/storage';

const KEY = 'altin_kasam_engagement_v1';

/** Kullanıcının uygulamayla etkileşimi; paywall ve puan isteme zamanlaması buna bakar. Cihazda kalır. */
export type EngagementState = {
  installAt: number;
  sessions: number;
  holdingsAdded: number;
  alarmsCreated: number;
  alarmsTriggered: number;
  softPaywalls: number;
  lastPaywallAt: number;
  reviewAsked: boolean;
};

const fresh = (): EngagementState => ({
  installAt: Date.now(),
  sessions: 0,
  holdingsAdded: 0,
  alarmsCreated: 0,
  alarmsTriggered: 0,
  softPaywalls: 0,
  lastPaywallAt: 0,
  reviewAsked: false,
});

let cache: EngagementState | null = null;
let loading: Promise<EngagementState> | null = null;

async function load(): Promise<EngagementState> {
  if (cache) return cache;
  loading ??= storageGet<EngagementState>(KEY)
    .catch(() => null)
    .then((saved) => {
      cache = { ...fresh(), ...(saved ?? {}) };
      return cache;
    });
  return loading;
}

export const engagementDatasource = {
  get: load,
  async update(patch: (state: EngagementState) => Partial<EngagementState>): Promise<EngagementState> {
    const current = await load();
    cache = { ...current, ...patch(current) };
    void storageSet(KEY, cache).catch(() => {});
    return cache;
  },
};
