import * as Network from 'expo-network';
import { AppState } from 'react-native';

export type ConnectionQuality = 'online' | 'weak' | 'offline';

export type NetworkStatus = {
  quality: ConnectionQuality;
  isOffline: boolean;
  isWeak: boolean;
  /** İşletim sisteminin bildirdiği bağlantı türü (Wi-Fi, hücresel...); bilinmiyorsa null. */
  type: Network.NetworkStateType | null;
  /** Çevrimdışına düşülen an; çevrimiçiyken null. */
  offlineSince: number | null;
  /** Sunucudan son başarılı yanıtın geldiği an. */
  lastSuccessAt: number | null;
};

export type RequestOutcome = 'ok' | 'timeout' | 'network';

type Sample = { at: number; durationMs: number; outcome: RequestOutcome };

/** Kalite yalnızca bu süre içindeki isteklere bakılarak hesaplanır. */
const SAMPLE_WINDOW_MS = 90_000;
const MAX_SAMPLES = 8;
/** Başarılı isteklerin ortanca süresi bunu aşarsa bağlantı zayıf sayılır. */
const SLOW_REQUEST_MS = 4_000;
const MIN_SLOW_SAMPLES = 2;
/** Penceredeki zaman aşımı / bağlantı hatası bu sayıya ulaşırsa bağlantı zayıf sayılır. */
const FAILURES_FOR_WEAK = 2;

type Listener = () => void;

/**
 * Uygulama genelinde tek ağ izleyicisi. İki kaynağı birleştirir:
 * 1. İşletim sistemi (`expo-network`): bağlantı var mı, internet erişilebilir mi.
 * 2. Gerçek istekler (`http.ts` bildirir): sunucuya ne kadar sürede ulaşılıyor, istekler düşüyor mu.
 * İşletim sistemi "bağlı" dese bile istekler yavaş ya da başarısızsa durum `weak` olur.
 *
 * React'ten bağımsızdır; bileşenler `useNetworkStatus` ile, veri katmanı doğrudan okur.
 */
class NetworkMonitor {
  private osOffline = false;
  private type: Network.NetworkStateType | null = null;
  private offlineSince: number | null = null;
  private lastSuccessAt: number | null = null;
  private samples: Sample[] = [];
  private status: NetworkStatus = {
    quality: 'online',
    isOffline: false,
    isWeak: false,
    type: null,
    offlineSince: null,
    lastSuccessAt: null,
  };
  private listeners = new Set<Listener>();
  private recoverListeners = new Set<Listener>();
  private started = false;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  /** İlk abonelikte kendiliğinden başlar; uygulama ömrü boyunca açık kalır. */
  start() {
    if (this.started) return;
    this.started = true;
    Network.addNetworkStateListener((state) => this.applyOsState(state));
    void this.check();
    // Arka plandayken kaçan değişiklikler için ön plana dönüşte yeniden sorulur.
    AppState.addEventListener('change', (next) => {
      if (next === 'active') void this.check();
    });
  }

  /** İşletim sistemine güncel durumu sorar. Döndürdüğü değer: çevrimiçi mi. */
  async check(): Promise<boolean> {
    try {
      this.applyOsState(await Network.getNetworkStateAsync());
    } catch {
      // Durum okunamazsa son bilinen değerle devam edilir.
    }
    return !this.osOffline;
  }

  /**
   * Kullanıcı "Tekrar dene" dediğinde: durum yeniden sorulur, çevrimiçiyse veri sağlayıcıları
   * yenilenir. Döndürdüğü değer: çevrimiçi mi.
   */
  async retry(): Promise<boolean> {
    const online = await this.check();
    if (online) this.emitRecover();
    return online;
  }

  getStatus = (): NetworkStatus => this.status;

  isOffline(): boolean {
    return this.status.isOffline;
  }

  isWeak(): boolean {
    return this.status.isWeak;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.start();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Bağlantı geri geldiğinde (ya da kullanıcı tekrar denediğinde) çağrılır. */
  onRecover(listener: Listener): () => void {
    this.start();
    this.recoverListeners.add(listener);
    return () => {
      this.recoverListeners.delete(listener);
    };
  }

  /** `http.ts` her istekten sonra çağırır. */
  record(outcome: RequestOutcome, durationMs: number) {
    const now = Date.now();
    if (outcome === 'ok') this.lastSuccessAt = now;
    this.samples = [...this.samples, { at: now, durationMs, outcome }].slice(-MAX_SAMPLES);
    this.recompute();
  }

  private applyOsState(state: Network.NetworkState) {
    // `undefined` bilinmiyor demek; yalnızca açıkça `false` ise çevrimdışı sayılır.
    const offline = state.isConnected === false || state.isInternetReachable === false;
    this.type = state.type ?? null;
    if (offline === this.osOffline) {
      this.recompute();
      return;
    }
    this.osOffline = offline;
    this.offlineSince = offline ? Date.now() : null;
    // Ağ değiştiğinde eski ölçümler yeni bağlantıyı temsil etmez.
    this.samples = [];
    this.recompute();
    if (!offline) this.emitRecover();
  }

  private recompute() {
    const now = Date.now();
    this.samples = this.samples.filter((s) => now - s.at < SAMPLE_WINDOW_MS);
    this.scheduleExpiry();

    const failures = this.samples.filter((s) => s.outcome !== 'ok').length;
    const okDurations = this.samples
      .filter((s) => s.outcome === 'ok')
      .map((s) => s.durationMs)
      .sort((a, b) => a - b);
    const median = okDurations.length ? okDurations[Math.floor(okDurations.length / 2)] : 0;
    const slow = okDurations.length >= MIN_SLOW_SAMPLES && median >= SLOW_REQUEST_MS;
    const weak = !this.osOffline && (failures >= FAILURES_FOR_WEAK || slow);

    const quality: ConnectionQuality = this.osOffline ? 'offline' : weak ? 'weak' : 'online';
    const prev = this.status;
    if (
      prev.quality === quality &&
      prev.type === this.type &&
      prev.offlineSince === this.offlineSince &&
      prev.lastSuccessAt === this.lastSuccessAt
    ) {
      return;
    }
    this.status = {
      quality,
      isOffline: quality === 'offline',
      isWeak: quality === 'weak',
      type: this.type,
      offlineSince: this.offlineSince,
      lastSuccessAt: this.lastSuccessAt,
    };
    this.listeners.forEach((l) => l());
  }

  /** İstek gelmese bile eski ölçümler pencereden düşünce durum yeniden hesaplanır. */
  private scheduleExpiry() {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    const oldest = this.samples[0];
    if (!oldest) return;
    const delay = Math.max(0, oldest.at + SAMPLE_WINDOW_MS - Date.now()) + 50;
    this.expiryTimer = setTimeout(() => this.recompute(), delay);
  }

  private emitRecover() {
    this.recoverListeners.forEach((l) => l());
  }
}

export const networkMonitor = new NetworkMonitor();
