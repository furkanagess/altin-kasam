import { STORE_LINKS } from '@/src/core/constants/stores';
import { appAlert } from '@/src/core/dialog/appAlert';
import { useValueMoments } from '@/src/viewmodels/engagement/useValueMoments';
import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import {
  alarmPlaceholder,
  alarmPriceOf,
  alarmTargetTitle,
  alarmValueCases,
  alarmValueNoun,
  formatAlarmValue,
  getAlarmAsset,
  type AlarmAsset,
} from '@/src/core/constants/alarmAssets';
import { GOLD_ASSETS } from '@/src/core/constants/goldAssets';
import { PAYWALL_REASON_TEXT } from '@/src/core/constants/premium';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { PriceAlarm } from '@/src/domain/models';
import { PriceTimestamp } from '@/src/widgets/molecules/PriceTimestamp';
import { formatDecimalInput, numberToInput, parseDecimalTr } from '@/src/utils/format';
import { ALARM_NOTE_MAX } from '@/src/data/repositories/alarmRepository';
import { useAlarms } from '@/src/viewmodels/alarm/AlarmProvider';
import { useAlarmPrices } from '@/src/viewmodels/alarm/useAlarmPrices';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useSnackbar } from '@/src/viewmodels/snackbar/SnackbarProvider';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { GoldAssetIcon } from '@/src/widgets/atoms/GoldAssetIcon';
import { GoldSilverRatioIcon, MetalIcon } from '@/src/widgets/atoms/MetalIcon';
import { TabIcon } from '@/src/widgets/atoms/TabIcon';
import { Screen } from '@/src/widgets/atoms/Screen';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

type Direction = PriceAlarm['direction'];

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'above', label: 'Yükselince' },
  { id: 'below', label: 'Düşünce' },
];
const STEPS = [1, 2, 5];
/** Alarm kurma ekranının üstündeki sekmeler: hedef fiyat olarak mı, güncel değere göre yüzde olarak mı girilir. */
type Mode = 'price' | 'percent';
const MODES: { id: Mode; label: string }[] = [
  { id: 'price', label: 'Fiyat' },
  { id: 'percent', label: 'Yüzde' },
];
/** Alarm kurma ekranındaki hazır hedefler: güncel fiyata göre yüzde (−/+). Yön hedefin konumundan çıkar. */
const PRESETS = [-5, -3, -1, 1, 3, 5] as const;

const parsePrice = parseDecimalTr;
const toInput = (value: number) => numberToInput(value, 2, 2);

/** "+₺106,50 (+%1,00)" / "−₺106,50 (−%1,00)"; rasyoda birimsiz. */
function formatDiff(asset: AlarmAsset, diff: number, base: number): string {
  const sign = diff > 0 ? '+' : '−';
  const percent = base ? (Math.abs(diff) / base) * 100 : 0;
  return `${sign}${formatAlarmValue(asset, Math.abs(diff))} · % ${sign}${percent.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
}

/**
 * Hedef, fiyatın büyüklüğüne göre yuvarlanır (çeyrekte 10 ₺, gramda 1 ₺): okunaklı olur ve
 * kullanıcı dokunmadıkça saniyelik fiyat tikleriyle titremez.
 */
function stepTarget(price: number, direction: Direction, percent: number) {
  const raw = price * (1 + (direction === 'above' ? percent : -percent) / 100);
  const increment = Math.max(0.01, 10 ** (Math.floor(Math.log10(raw)) - 3));
  return Math.round(raw / increment) * increment;
}

function AssetIcon({ asset }: { asset: AlarmAsset }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (asset.kind === 'gold') return <GoldAssetIcon asset={asset.gold} size={30} maxWidth={64} />;
  if (asset.kind === 'metal' || asset.kind === 'ounce') return <MetalIcon symbol={asset.metal} size={40} />;
  if (asset.kind === 'ratio') return <GoldSilverRatioIcon size={40} />;
  return (
    <View style={styles.portfolioIcon}>
      <TabIcon name="portfolio" color={colors.brand.goldDeep} focused />
    </View>
  );
}

/** Silmeden önce onay. */
function confirmRemove(label: string, onConfirm: () => void) {
  const message = `${label} alarmı silinsin mi?`;
  appAlert('Alarmı sil', message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: onConfirm },
  ]);
}

/** Bekleyen alarmı satırın içinde düzenler: yön, hedef fiyat ve hızlı yüzde adımları. */
function AlarmEditor({
  alarm,
  asset,
  current,
  onSave,
  onCancel,
}: {
  alarm: PriceAlarm;
  asset: AlarmAsset;
  current?: number;
  onSave: (direction: Direction, target: number) => Promise<void>;
  onCancel: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const cases = alarmValueCases(asset);
  const [direction, setDirection] = useState<Direction>(alarm.direction);
  const [text, setText] = useState(toInput(alarm.target));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const target = parsePrice(text);

  const save = async () => {
    if (!Number.isFinite(target) || target <= 0) return setError('Geçerli bir hedef fiyat gir');
    if (current && (direction === 'above' ? target <= current : target >= current)) {
      return setError(
        direction === 'above' ? `Hedef, güncel ${cases.genitive} üstünde olmalı` : `Hedef, güncel ${cases.genitive} altında olmalı`,
      );
    }
    setSaving(true);
    try {
      await onSave(direction, target);
    } catch {
      setError('Alarm güncellenemedi');
      setSaving(false);
    }
  };

  return (
    <View style={styles.editor}>
      <View style={styles.segment} role="radiogroup" aria-label="Alarm yönü">
        {DIRECTIONS.map((d) => {
          const active = d.id === direction;
          return (
            <Pressable
              key={d.id}
              onPress={() => {
                setDirection(d.id);
                setError(null);
              }}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              role="radio"
              aria-checked={active}
            >
              <AppText variant="bodyStrong" tone={active ? 'primary' : 'secondary'}>
                {d.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(formatDecimalInput(t, text));
          setError(null);
        }}
        keyboardType="decimal-pad"
        style={styles.input}
        placeholder={alarmPlaceholder(asset)}
        placeholderTextColor={colors.text.tertiary}
        accessibilityLabel={alarmTargetTitle(asset)}
        selectTextOnFocus
      />
      {current ? (
        <View style={styles.steps}>
          {STEPS.map((p) => (
            <Pressable
              key={p}
              onPress={() => setText(toInput(stepTarget(current, direction, p)))}
              style={[styles.step, direction === 'above' ? styles.stepUp : styles.stepDown]}
              accessibilityRole="button"
            >
              <AppText variant="caption" tone={direction === 'above' ? 'up' : 'down'} style={styles.stepText}>
                {`${direction === 'above' ? '+' : '−'}%${p}`}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? (
        <AppText variant="caption" tone="down">
          {error}
        </AppText>
      ) : null}
      <View style={styles.editorActions}>
        <AppButton label="Vazgeç" variant="ghost" style={styles.flex} onPress={onCancel} />
        <AppButton label="Kaydet" style={styles.flex} loading={saving} onPress={() => void save()} />
      </View>
    </View>
  );
}

/**
 * Alarm satırı: varlık ikonu, yönlü koşul, güncel fiyata uzaklık ve durum. Bekleyen alarmda
 * "Düzenle" satırı açar, "Sil" onay ister; tetiklenmişte yalnızca "Sil".
 */
function AlarmRow({
  alarm,
  current,
  onRemove,
  onUpdate,
}: {
  alarm: PriceAlarm;
  current?: number;
  onRemove: () => void;
  onUpdate: (patch: Pick<PriceAlarm, 'direction' | 'target'>) => Promise<void>;
}) {
  const styles = useStyles();
  const [editing, setEditing] = useState(false);
  const asset = getAlarmAsset(alarm.assetId);
  const above = alarm.direction === 'above';
  const triggered = !!alarm.triggeredAt;
  const format = (v: number) => (asset ? formatAlarmValue(asset, v) : String(v));
  const when = triggered
    ? new Date(alarm.triggeredAt!).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
    : null;
  const label = asset?.label ?? alarm.assetId;
  return (
    <View style={[styles.alarmItem, triggered && styles.alarmDone]}>
      <View style={styles.alarmRow}>
        {asset ? <AssetIcon asset={asset} /> : null}
        <View style={styles.alarmText}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {label}
          </AppText>
          <AppText variant="caption" tone={above ? 'up' : 'down'} style={styles.condition}>
            {above ? '↑ Yükselince' : '↓ Düşünce'}
          </AppText>
          {alarm.note ? (
            <AppText variant="caption" tone="secondary" numberOfLines={2}>
              {alarm.note}
            </AppText>
          ) : null}
          {!triggered && current ? (
            <AppText variant="caption" tone="tertiary">
              {`Güncel ${format(current)}`}
            </AppText>
          ) : null}
          {when ? (
            <AppText variant="caption" tone="tertiary">
              {`Tetiklendi · ${when}`}
            </AppText>
          ) : null}
        </View>
        <View style={styles.targetBlock}>
          <AppText variant="caption" tone="tertiary" style={styles.targetLabel}>
            ALARM FİYATI
          </AppText>
          <AppText variant="h3" numberOfLines={1} adjustsFontSizeToFit>
            {format(alarm.target)}
          </AppText>
          {triggered ? (
            <View style={[styles.statusPill, styles.statusDone]}>
              <AppText variant="caption" tone="up" style={styles.statusText}>
                Tetiklendi
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {editing && asset && !triggered ? (
        <AlarmEditor
          alarm={alarm}
          asset={asset}
          current={current}
          onCancel={() => setEditing(false)}
          onSave={async (direction, target) => {
            await onUpdate({ direction, target });
            setEditing(false);
          }}
        />
      ) : (
        <View style={styles.rowActions}>
          {!triggered ? (
            <Pressable
              onPress={() => setEditing(true)}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={`${label} alarmını düzenle`}
            >
              <AppText variant="caption" tone="gold" style={styles.actionText}>
                Düzenle
              </AppText>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => confirmRemove(label, onRemove)}
            style={[styles.actionButton, styles.actionDanger]}
            accessibilityRole="button"
            accessibilityLabel={`${label} alarmını sil`}
          >
            <AppText variant="caption" tone="down" style={styles.actionText}>
              Sil
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function AlarmScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ assetId?: string }>();
  const asset = getAlarmAsset(params.assetId ?? '') ?? getAlarmAsset(GOLD_ASSETS[0].id)!;
  const prices = useAlarmPrices();
  const { openPaywall } = useSubscription();
  const { showSnackbar } = useSnackbar();
  const { alarms, canAdd, addAlarm, removeAlarm, updateAlarm, markSeen } = useAlarms();
  const { reach } = useValueMoments();
  // Alarm ekranı açılınca bu varlığın tetiklenen alarmları görülmüş sayılır; ikondaki rozet kaybolur.
  useEffect(() => {
    void markSeen(asset.id);
  }, [asset.id, markSeen]);
  /** Piyasa verisinin en son başarıyla alındığı an. */
  const updatedAt = useMarketViewModel().snapshot?.updatedAt;

  const current = alarmPriceOf(asset.id, prices) ?? 0;
  const noun = alarmValueNoun(asset);
  const cases = alarmValueCases(asset);
  const [mode, setMode] = useState<Mode>('price');
  /** Fiyat sekmesi: hedef alanı boş başlar; hazır yüzdelerden biri ya da elle yazılan değer. */
  const [typedTarget, setTargetText] = useState<string | null>(null);
  /** Yüzde sekmesi: işaretsiz yüzde ve yön (artınca / düşünce). */
  const [percentText, setPercentText] = useState('');
  const [percentSign, setPercentSign] = useState<'up' | 'down'>('up');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dokunulmadıkça hedef alanında güncel birim fiyat yazılıdır.
  const targetText = typedTarget ?? (current ? toInput(current) : '');
  const percent = parsePrice(percentText);
  const percentValid = Number.isFinite(percent) && percent > 0 && (percentSign === 'up' || percent < 100);
  /** Yüzde sekmesinde hedef, alarm kurulduğu andaki güncel değerden hesaplanır (alarm yine sabit bir hedeftir). */
  const target =
    mode === 'price'
      ? parsePrice(targetText)
      : current && percentValid
        ? Math.round(current * (1 + (percentSign === 'up' ? percent : -percent) / 100) * 100) / 100
        : NaN;
  const targetValid = Number.isFinite(target) && target > 0;
  /** Fiyat sekmesinde yön seçilmez: hedef güncel fiyatın üstündeyse yükselince, altındaysa düşünce haber verilir. */
  const direction: Direction =
    mode === 'percent' ? (percentSign === 'down' ? 'below' : 'above') : current && targetValid && target < current ? 'below' : 'above';

  const onSave = async () => {
    if (!targetValid) return setError(mode === 'percent' ? 'Geçerli bir yüzde gir' : 'Geçerli bir hedef fiyat gir');
    if (!current) return setError('Güncel değer alınamadı, biraz sonra tekrar dene');
    if (target === current) return setError(`Hedef, güncel ${cases.genitive} dışında bir değer olmalı`);
    setSaving(true);
    setError(null);
    try {
      if (await addAlarm({ assetId: asset.id, direction, target, note: note.trim() || undefined })) {
        analyticsDatasource.track({ name: 'alarm_created', mode, hasNote: Boolean(note.trim()), first: alarms.length === 0 });
        showSnackbar('Alarm başarıyla kuruldu');
        router.back();
        void reach('alarm_created', 3200);
      }
    } catch {
      setError('Alarm kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const footer = canAdd ? (
    <AppButton
      label="Alarm kur"
      loading={saving}
      disabled={saving || !targetValid}
      onPress={() => void onSave()}
    />
  ) : (
    <>
      <AppText variant="caption" tone="secondary">
        {PAYWALL_REASON_TEXT.alarm}
      </AppText>
      <AppButton label="Pro’yu incele" onPress={() => openPaywall('alarm')} />
    </>
  );

  // Hedefin güncel fiyata göre farkı: üstündeyse yeşil "+", altındaysa kırmızı "−".
  const diff = current && targetValid ? target - current : 0;
  const diffTone = diff > 0 ? 'up' : diff < 0 ? 'down' : undefined;
  const tone = diffTone && { color: diffTone === 'up' ? colors.semantic.up : colors.semantic.down };

  return (
    <Screen webWidth="readable" scroll footer={footer}>
      <View style={styles.segment} role="tablist" aria-label="Alarm türü">
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                setMode(m.id);
                setError(null);
              }}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              role="tab"
              aria-selected={active}
            >
              <AppText variant="bodyStrong" tone={active ? 'primary' : 'secondary'}>
                {m.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.assetCard}>
        <AssetIcon asset={asset} />
        <View style={styles.assetText}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {asset.label}
          </AppText>
          {current && updatedAt ? (
            <PriceTimestamp timestamp={updatedAt} />
          ) : (
            <AppText variant="caption" tone="secondary">
              Değer bekleniyor
            </AppText>
          )}
        </View>
        {current ? (
          <AppText variant="price" style={styles.currentPrice} accessibilityLabel={`Güncel ${noun} ${formatAlarmValue(asset, current)}`}>
            {formatAlarmValue(asset, current)}
          </AppText>
        ) : null}
      </View>

      <View style={styles.group}>
        <AppText variant="h3">{mode === 'price' ? alarmTargetTitle(asset) : 'Değişim'}</AppText>
        {mode === 'price' ? (
          <View style={styles.lineRow}>
            {asset.kind !== 'ratio' ? (
              <AppText style={[styles.lineSymbol, tone]} accessibilityElementsHidden>
                {asset.kind === 'ounce' ? '$' : '₺'}
              </AppText>
            ) : null}
            <TextInput
              value={targetText}
              onChangeText={(t) => {
                setTargetText(formatDecimalInput(t, targetText));
                setError(null);
              }}
              keyboardType="decimal-pad"
              style={[styles.input, styles.lineInput, diffTone && { color: diffTone === 'up' ? colors.semantic.up : colors.semantic.down }]}
              placeholder={alarmPlaceholder(asset)}
              placeholderTextColor={colors.text.tertiary}
              accessibilityLabel={alarmTargetTitle(asset)}
            />
          </View>
        ) : (
          <View style={[styles.percentRow, { borderBottomColor: colors.border.strong }]}>
            <AppText style={[styles.lineSymbol, { color: percentSign === 'up' ? colors.semantic.up : colors.semantic.down }]}>
              %
            </AppText>
            <Pressable
              onPress={() => {
                setPercentSign((v) => (v === 'up' ? 'down' : 'up'));
                setError(null);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={percentSign === 'up' ? 'Artınca haber ver, düşünceye çevir' : 'Düşünce haber ver, artınca çevir'}
            >
              <AppText style={[styles.lineSymbol, { color: percentSign === 'up' ? colors.semantic.up : colors.semantic.down }]}>
                {percentSign === 'up' ? '+' : '−'}
              </AppText>
            </Pressable>
            <TextInput
              value={percentText}
              onChangeText={(t) => {
                setPercentText(formatDecimalInput(t, percentText));
                setError(null);
              }}
              keyboardType="decimal-pad"
              style={[styles.input, styles.percentField, { color: percentSign === 'up' ? colors.semantic.up : colors.semantic.down }]}
              placeholder="Örn. 3"
              placeholderTextColor={colors.text.tertiary}
              accessibilityLabel="Değişim yüzdesi"
            />
          </View>
        )}
        {current ? (
          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const value = stepTarget(current, p > 0 ? 'above' : 'below', Math.abs(p));
              const selected =
                mode === 'price'
                  ? targetValid && Math.abs(target - value) < 0.005
                  : percentValid && percentSign === (p > 0 ? 'up' : 'down') && Math.abs(percent - Math.abs(p)) < 0.001;
              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    if (mode === 'price') setTargetText(toInput(value));
                    else {
                      setPercentSign(p > 0 ? 'up' : 'down');
                      setPercentText(String(Math.abs(p)));
                    }
                    setError(null);
                  }}
                  style={[
                    styles.preset,
                    p > 0 ? styles.stepUp : styles.stepDown,
                    selected && (p > 0 ? styles.presetUpActive : styles.presetDownActive),
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Güncel değerin yüzde ${Math.abs(p)} ${p > 0 ? 'üstü' : 'altı'}`}
                >
                  <AppText
                    variant="caption"
                    tone={selected ? undefined : p > 0 ? 'up' : 'down'}
                    style={[styles.stepText, selected && styles.presetTextActive]}
                  >
                    {`${p > 0 ? '+' : '−'}%${Math.abs(p)}`}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {diffTone ? (
          <AppText variant="caption" tone={diffTone} style={styles.diff}>
            {mode === 'percent'
              ? `Hedef fiyat ${formatAlarmValue(asset, target)} · ${formatDiff(asset, diff, current)}`
              : `${formatDiff(asset, diff, current)} · güncel ${cases.dative} göre`}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.group, styles.noteGroup]}>
        <AppText variant="h3">Not</AppText>
        <TextInput
          value={note}
          onChangeText={setNote}
          maxLength={ALARM_NOTE_MAX}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.noteInput]}
          placeholder="Not ekle (isteğe bağlı)"
          placeholderTextColor={colors.text.tertiary}
          returnKeyType="done"
          accessibilityLabel="Alarm notu"
        />
      </View>

      {error ? (
        <AppText variant="caption" tone="down">
          {error}
        </AppText>
      ) : null}

      {alarms.length ? (
        <>
          {[
            { title: 'Bekleyen alarmlar', items: alarms.filter((a) => !a.triggeredAt) },
            { title: 'Tetiklenenler', items: alarms.filter((a) => a.triggeredAt) },
          ]
            .filter((group) => group.items.length)
            .map((group) => (
              <View key={group.title} style={styles.listGroup}>
                <SectionHeader title={`${group.title} · ${group.items.length}`} />
                <View style={styles.list}>
                  {group.items.map((a) => (
                    <AlarmRow
                      key={a.id}
                      alarm={a}
                      current={alarmPriceOf(a.assetId, prices)}
                      onRemove={() => void removeAlarm(a.id)}
                      onUpdate={(patch) => updateAlarm(a.id, patch)}
                    />
                  ))}
                </View>
              </View>
            ))}
        </>
      ) : null}

      {/* Web'de push yok: alarm yalnızca sekme açıkken tarayıcı bildirimiyle çalar. */}
      {Platform.OS === 'web' ? (
        <View style={styles.webNote}>
          <AppText variant="caption" tone="secondary">
            Web’de alarm bu sekme açıkken tarayıcı bildirimiyle çalar. Tarayıcı kapalıyken de haber almak için
            alarmı telefonundaki Altın Kasam uygulamasında kur.
          </AppText>
          <View style={styles.webNoteLinks}>
            <AppText variant="caption" tone="gold" onPress={() => void Linking.openURL(STORE_LINKS.ios)}>
              App Store
            </AppText>
            <AppText variant="caption" tone="gold" onPress={() => void Linking.openURL(STORE_LINKS.android)}>
              Google Play
            </AppText>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  webNote: {
    gap: paddings.xs,
    padding: paddings.card,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
  },
  webNoteLinks: { flexDirection: 'row', gap: paddings.md },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
  assetText: { flex: 1, gap: 2 },
  currentPrice: { fontSize: 26, lineHeight: 32, fontWeight: '800', textAlign: 'right' },
  portfolioIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.goldBadge,
  },
  group: { gap: 8 },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.muted,
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: paddings.xs, borderRadius: radii.pill },
  segmentItemActive: {
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.elevated,
    borderRadius: radii.md,
    paddingHorizontal: paddings.md,
    paddingVertical: paddings.sm,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  // Kutusuz, kısa ve ortalı: yalnızca alt çizgi.
  lineInput: {
    alignSelf: 'center',
    width: 200,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  lineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  lineSymbol: { fontSize: 32, lineHeight: 42, fontWeight: '700', color: colors.text.primary },
  noteGroup: { marginTop: paddings.xl },
  noteInput: { minHeight: 110, paddingTop: paddings.sm },
  steps: { flexDirection: 'row', gap: 8 },
  diff: { fontWeight: '600' },
  step: {
    paddingHorizontal: paddings.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  stepUp: { borderColor: colors.semantic.up, backgroundColor: colors.semantic.upSoft },
  stepDown: { borderColor: colors.semantic.down, backgroundColor: colors.semantic.downSoft },
  stepText: { fontWeight: '700' },
  presets: { flexDirection: 'row', gap: 6 },
  // Çizgi tüm satırı kaplar: %, işaret ve sayı çizginin içinde.
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    width: 200,
    gap: 4,
    borderBottomWidth: 2,
  },
  percentField: {
    minWidth: 70,
    textAlign: 'center',
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    fontSize: 32,
    fontWeight: '700',
  },
  signButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  preset: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1 },
  presetUpActive: { backgroundColor: colors.semantic.up },
  presetDownActive: { backgroundColor: colors.semantic.down },
  // Dolu zeminde okunsun.
  presetTextActive: { color: '#FFFFFF' },
  listGroup: { gap: paddings.xs },
  // Kutu yerine üstte ve altta ince çizgi; satırlar kendi aralarında çizgiyle ayrılır.
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  alarmItem: {
    gap: paddings.xs,
    paddingVertical: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  alarmRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm },
  flex: { flex: 1 },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: paddings.xs },
  actionButton: {
    minWidth: 76,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: paddings.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
  },
  actionDanger: { borderColor: colors.semantic.down },
  actionText: { fontWeight: '700' },
  editor: {
    gap: paddings.xs,
    padding: paddings.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
  },
  editorActions: { flexDirection: 'row', gap: paddings.xs },
  alarmDone: { opacity: 0.75 },
  alarmText: { flex: 1, gap: 2 },
  targetBlock: { alignItems: 'flex-end', gap: 2, maxWidth: 140 },
  targetLabel: { letterSpacing: 0.6, fontSize: 10 },
  condition: { fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  statusWaiting: { backgroundColor: colors.surface.goldTint, borderWidth: 1, borderColor: colors.brand.goldSoft },
  statusDone: { backgroundColor: colors.semantic.upSoft },
  statusText: { fontWeight: '700' },
}));
