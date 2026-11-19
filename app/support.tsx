import { appAlert } from '@/src/core/dialog/appAlert';
import { SUPPORT_EMAIL } from '@/src/core/constants/app';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import {
  SUPPORT_MESSAGE_MAX,
  SUPPORT_MESSAGE_MIN,
  supportDatasource,
  type SupportTopic,
} from '@/src/data/datasources/supportDatasource';
import { useAccount } from '@/src/viewmodels/account/AccountProvider';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

const TOPICS: { id: SupportTopic; label: string; placeholder: string }[] = [
  {
    id: 'problem',
    label: 'Sorun bildir',
    placeholder: 'Ne oldu, hangi ekrandaydın? Ne bekliyordun?',
  },
  {
    id: 'suggestion',
    label: 'Öneri / soru',
    placeholder: 'Aklındaki fikri ya da soruyu yaz',
  },
];

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export default function SupportScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ topic?: string }>();
  const { isPremium } = useSubscription();
  const { account } = useAccount();
  const [topic, setTopic] = useState<SupportTopic>(params.topic === 'suggestion' ? 'suggestion' : 'problem');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(account?.email ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = TOPICS.find((t) => t.id === topic) ?? TOPICS[0];
  const trimmed = message.trim();

  const onSend = async () => {
    if (trimmed.length < SUPPORT_MESSAGE_MIN) {
      setError('Mesajın biraz daha uzun olmalı.');
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError('E-posta adresi geçerli görünmüyor.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const result = await supportDatasource.send({ topic, message: trimmed, email, premium: isPremium });
      if (result.ok) {
        appAlert(
          'Mesajın bize ulaştı',
          email.trim() ? 'Teşekkürler! En kısa sürede e-postayla dönüş yapacağız.' : 'Teşekkürler, geri bildirimin için.',
        );
        router.back();
        return;
      }
      if (result.reason === 'rate') {
        setError('Kısa sürede çok mesaj gönderildi. Biraz sonra tekrar dene.');
      } else if (result.reason === 'invalid') {
        setError('Mesaj gönderilemedi. Metni kontrol edip tekrar dene.');
      } else {
        appAlert('Mesaj gönderilemedi', 'İnternet bağlantını kontrol et ya da mail uygulamanla yaz.', [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Mail uygulamasını aç', onPress: () => void supportDatasource.openMail(topic) },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen webWidth="readable" scroll>
      <View style={styles.segments} role="radiogroup" aria-label="Konu">
        {TOPICS.map((t) => {
          const selected = t.id === topic;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTopic(t.id)}
              style={[styles.segment, selected && styles.segmentSelected]}
              role="radio"
              aria-checked={selected}
              aria-label={t.label}
            >
              <AppText variant="bodyStrong" tone={selected ? 'gold' : 'primary'}>
                {t.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.group}>
        <AppText variant="h3">Mesajın</AppText>
        <TextInput
          value={message}
          onChangeText={(t) => {
            setMessage(t);
            setError(null);
          }}
          maxLength={SUPPORT_MESSAGE_MAX}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.messageInput]}
          placeholder={current.placeholder}
          placeholderTextColor={colors.text.tertiary}
          accessibilityLabel="Mesajın"
        />
        <AppText variant="caption" tone="tertiary" style={styles.counter}>
          {message.length}/{SUPPORT_MESSAGE_MAX}
        </AppText>
      </View>

      <View style={styles.group}>
        <AppText variant="h3">E-posta (isteğe bağlı)</AppText>
        <TextInput
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          maxLength={120}
          style={styles.input}
          placeholder="Dönüş yapabilmemiz için"
          placeholderTextColor={colors.text.tertiary}
          accessibilityLabel="E-posta adresin"
        />
        <AppText variant="caption" tone="secondary">
          Uygulama sürümü ve cihaz modeli sorunu çözebilmemiz için mesaja eklenir.
        </AppText>
      </View>

      {error ? (
        <AppText variant="caption" tone="down">
          {error}
        </AppText>
      ) : null}

      <AppButton label="Gönder" loading={sending} disabled={sending} onPress={() => void onSend()} />
      <AppText variant="caption" tone="tertiary" style={styles.footnote}>
        Doğrudan da yazabilirsin: {SUPPORT_EMAIL}
      </AppText>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  segments: {
    flexDirection: 'row',
    gap: paddings.xs,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: paddings.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  segmentSelected: {
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
  group: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.elevated,
    borderRadius: radii.md,
    paddingHorizontal: paddings.md,
    paddingVertical: paddings.sm,
    fontSize: 16,
    color: colors.text.primary,
  },
  messageInput: { minHeight: 140 },
  counter: { alignSelf: 'flex-end' },
  footnote: { textAlign: 'center' },
}));
