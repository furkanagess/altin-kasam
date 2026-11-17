import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Linking, Platform } from 'react-native';

import { APP_NAME, SUPPORT_EMAIL } from '@/src/core/constants/app';
import { getInstallId } from '@/src/core/storage/installId';

export type SupportTopic = 'problem' | 'suggestion';

/** Firebase `support` ucu; gizli değildir, mesajları sunucu doğrular ve sınırlar. */
const SUPPORT_URL =
  process.env.EXPO_PUBLIC_SUPPORT_API_URL || 'https://us-central1-altin-kasam-628d2.cloudfunctions.net/support';
const TIMEOUT_MS = 15_000;
export const SUPPORT_MESSAGE_MAX = 2000;
export const SUPPORT_MESSAGE_MIN = 5;

export type SendSupportResult = { ok: true } | { ok: false; reason: 'rate' | 'invalid' | 'network' };

const SUBJECTS: Record<SupportTopic, string> = {
  problem: `${APP_NAME} – Sorun bildirimi`,
  suggestion: `${APP_NAME} – Öneri / soru`,
};

const INTROS: Record<SupportTopic, string> = {
  problem: 'Karşılaştığın sorunu ve hangi ekranda olduğunu kısaca anlat:',
  suggestion: 'Mesajın:',
};

/** Sorunu çözmeye yarayan cihaz bilgisi; kişisel veri içermez. */
function deviceInfo() {
  const version = Application.nativeApplicationVersion ?? '?';
  const build = Application.nativeBuildVersion ?? '?';
  return {
    appVersion: `${version} (${build})`,
    os: `${Device.osName ?? Platform.OS} ${Device.osVersion ?? ''}`.trim(),
    model: Device.modelName ?? 'Bilinmeyen cihaz',
  };
}

export function buildSupportMailto(topic: SupportTopic): string {
  const info = deviceInfo();
  const summary = [`Uygulama: ${info.appVersion}`, `Sistem: ${info.os}`, `Cihaz: ${info.model}`].join('\n');
  const body = `${INTROS[topic]}\n\n\n\n---\n${summary}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUBJECTS[topic])}&body=${encodeURIComponent(body)}`;
}

export const supportDatasource = {
  /** Mesajı uygulama içinden destek adresine gönderir (mail uygulaması açılmaz). */
  async send(input: {
    topic: SupportTopic;
    message: string;
    email?: string;
    premium: boolean;
  }): Promise<SendSupportResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(SUPPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installId: await getInstallId(),
          topic: input.topic,
          message: input.message.trim(),
          email: input.email?.trim() || undefined,
          meta: { ...deviceInfo(), premium: input.premium },
        }),
        signal: controller.signal,
      });
      if (res.ok) return { ok: true };
      if (res.status === 429) return { ok: false, reason: 'rate' };
      if (res.status === 400) return { ok: false, reason: 'invalid' };
      return { ok: false, reason: 'network' };
    } catch {
      return { ok: false, reason: 'network' };
    } finally {
      clearTimeout(timeout);
    }
  },

  /** Mail uygulamasını hazır konu ve cihaz bilgisiyle açar; açılamazsa `false` döner. */
  async openMail(topic: SupportTopic): Promise<boolean> {
    try {
      await Linking.openURL(buildSupportMailto(topic));
      return true;
    } catch {
      return false;
    }
  },
};
