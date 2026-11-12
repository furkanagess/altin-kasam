import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { MetalInsight } from '@/src/domain/models';
import { AppText } from '@/src/widgets/atoms/AppText';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { PremiumBlur } from '@/src/widgets/molecules/PremiumBlur';
import { SignalGauge, signalMeta } from '@/src/widgets/molecules/SignalGauge';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

type Topic = MetalInsight['topic'];

type Props = {
  gold: MetalInsight;
  silver: MetalInsight;
  loading: boolean;
  /** Pro değilse sonuç bulanık gösterilir ve tüm kart `onLockedPress` çağırır; metal hücreleri kapalıdır. */
  locked: boolean;
  onLockedPress: () => void;
  onOpen: (topic: Topic) => void;
};

const METALS = [
  { key: 'gold', label: 'Altın' },
  { key: 'silver', label: 'Gümüş' },
] as const;

export function InsightCard({ gold, silver, loading, locked, onLockedPress, onOpen }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const byKey = { gold, silver };
  const analyzed = gold.analyzed + silver.analyzed;
  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.title}>
          <AppText variant="bodyStrong">Topluluk beklentisi</AppText>
          <ProMark />
        </View>
      </View>

      {loading && !analyzed ? (
        <ActivityIndicator color={colors.brand.gold} />
      ) : (
        <PremiumBlur locked={locked}>
          <View style={styles.metals}>
            {METALS.map((metal) => {
              const insight = byKey[metal.key];
              const meta = signalMeta(colors)[insight.signal];
              const content = (
                <>
                  <SignalGauge signal={insight.signal} score={insight.score} size={52} showLabel={false} />
                  <View style={styles.metalText}>
                    <AppText variant="caption" tone="secondary">{metal.label} ›</AppText>
                    <AppText variant="caption" style={[styles.signal, { color: meta.color }]} numberOfLines={1}>
                      {meta.label}
                    </AppText>
                  </View>
                </>
              );
              // Kilitliyken dokunuşu kartın kendisi alır; iç içe düğme olmaz.
              if (locked) {
                return (
                  <View key={metal.key} style={styles.metal}>
                    {content}
                  </View>
                );
              }
              return (
                <Pressable
                  key={metal.key}
                  onPress={() => onOpen(metal.key)}
                  style={({ pressed }) => [styles.metal, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${metal.label} topluluk beklentisi: ${meta.label}`}
                >
                  {content}
                </Pressable>
              );
            })}
          </View>
        </PremiumBlur>
      )}
    </>
  );

  if (!locked) return <View style={styles.card}>{body}</View>;
  return (
    <Pressable
      onPress={onLockedPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel="Topluluk beklentisi, Pro"
    >
      {body}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    gap: 8,
    paddingHorizontal: paddings.card,
    paddingVertical: paddings.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metals: { flexDirection: 'row', gap: paddings.xs, backgroundColor: colors.surface.goldTint },
  metal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.xs,
    padding: paddings.xxs,
    borderRadius: radii.sm,
  },
  pressed: { backgroundColor: colors.brand.goldSoft },
  metalText: { flex: 1 },
  signal: { fontWeight: '700' },}));
