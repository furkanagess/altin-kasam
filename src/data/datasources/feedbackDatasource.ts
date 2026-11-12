import { Platform } from 'react-native';

type AudioModule = typeof import('expo-audio');
type HapticsModule = typeof import('expo-haptics');
type Player = ReturnType<AudioModule['createAudioPlayer']>;

const COIN_DROP = require('@/assets/sounds/coin-drop.wav');
const COIN_CHLINC = require('@/assets/sounds/coin_chlinc.wav');

let audio: AudioModule | null | undefined;
let haptics: HapticsModule | null | undefined;
let coinPlayer: Player | null = null;
let chlincPlayer: Player | null = null;

/**
 * `expo-audio` ve `expo-haptics` içe aktarıldığı anda native modülü ister; paketler eklenmeden
 * önce alınmış development build'de bu modüller yoktur. İlk kullanımda yüklenir, yoksa sessiz geçilir.
 */
function loadAudio(): AudioModule | null {
  if (audio !== undefined) return audio;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('expo-audio') as AudioModule;
    // Sessiz anahtarına uyar ve çalan müziği durdurmaz; geri bildirim sesi araya karışır.
    void module.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    audio = module;
  } catch {
    audio = null;
  }
  return audio;
}

function loadHaptics(): HapticsModule | null {
  if (haptics !== undefined) return haptics;
  if (Platform.OS === 'web') return (haptics = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    haptics = require('expo-haptics') as HapticsModule;
  } catch {
    haptics = null;
  }
  return haptics;
}

export const feedbackDatasource = {
  /** Kasaya sikke düşme sesi; oynatıcı bir kez oluşturulur, her seferinde baştan çalar. */
  playCoinDrop(): void {
    const module = loadAudio();
    if (!module) return;
    try {
      coinPlayer ??= module.createAudioPlayer(COIN_DROP);
      void coinPlayer.seekTo(0);
      coinPlayer.play();
    } catch {
      // Ses çalınamazsa animasyon sessiz devam eder.
    }
  },

  /** Sikke kasaya düştüğü an: kısa ve tok titreşim. */
  impact(): void {
    const module = loadHaptics();
    void module?.impactAsync(module.ImpactFeedbackStyle.Medium).catch(() => {});
  },

  /** Kısa altın "çın" sesi (miktar artışı); oynatıcı bir kez oluşturulur, her seferinde baştan çalar. */
  playCoinChlinc(): void {
    const module = loadAudio();
    if (!module) return;
    try {
      chlincPlayer ??= module.createAudioPlayer(COIN_CHLINC);
      void chlincPlayer.seekTo(0);
      chlincPlayer.play();
    } catch {
      // Ses çalınamazsa titreşim yine gelir.
    }
  },

  /** Miktar bir birim arttı: parmağa basış hissi (orta titreşim) ve "çın" sesi. */
  quantityUp(): void {
    this.impact();
    this.playCoinChlinc();
  },

  /** Seçim değişti (varlık, basım): yalnızca tok bir "basılma" titreşimi, ses yok. */
  select(): void {
    this.impact();
  },

  /** Miktar bir birim azaldı: yalnızca hafif titreşim, ses yok. */
  quantityDown(): void {
    const module = loadHaptics();
    void module?.impactAsync(module.ImpactFeedbackStyle.Light).catch(() => {});
  },

  /** İşlem tamamlandı titreşimi. */
  success(): void {
    const module = loadHaptics();
    void module?.notificationAsync(module.NotificationFeedbackType.Success).catch(() => {});
  },
};
