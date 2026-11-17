import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { engagementDatasource } from '@/src/data/datasources/engagementDatasource';
import { useGoal } from '@/src/viewmodels/goal/GoalProvider';
import { useTour } from '@/src/viewmodels/tour/TourProvider';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { useGramAskPrice } from '@/src/viewmodels/goal/useGoalProgress';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { GoalForm } from '@/src/widgets/organisms/GoalForm';
import { AlarmDemo, CalendarDemo, LivePriceDemo, NewsDemo, VaultDemo } from '@/src/widgets/organisms/OnboardingDemos';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Her sayfa: üstte özelliğin hareketli demosu, altında vurucu başlık ve kısa açıklama. */
const PAGES = [
  {
    Preview: VaultDemo,
    title: 'Altının kasada, getirisi hesapta',
    body: 'Aldığın altını kasana at; değerini ve kazancını otomatik hesaplayıp takip ederiz. Kasan yalnızca telefonunda durur.',
  },
  {
    Preview: LivePriceDemo,
    title: 'Kuyumcuya gitmeden fiyatı bil',
    body: 'Gram, çeyrek, bilezik; ayrıca gümüş, platin ve paladyum. Her fiyatın saati yanında yazar, güncelliği hep görürsün.',
  },
  {
    Preview: AlarmDemo,
    title: 'Hedefe gelince telefonun çalar',
    body: 'Hedef fiyatı yaz; altın oraya gelince telefonuna bildirim düşer, uygulama kapalıyken bile. Alarmı sen kurarsın.',
  },
  {
    Preview: CalendarDemo,
    title: 'Piyasada olan biteni kaçırma',
    body: 'Faiz, enflasyon ve istihdam verisi altını dakikalar içinde oynatabilir. Takvimde hepsi var; hatırlatma Pro’da.',
  },
  {
    Preview: NewsDemo,
    title: 'Haberler ve analizler tek yerde',
    body: 'Haberlerin altına etkisini analiz ederiz; haftalık analizde yön beklentisini görürsün. Güncel analiz Pro’da.',
  },
] as const;
const PAGE_COUNT = PAGES.length;

/**
 * İlk açılışta bir kez gösterilir. Ayarlar > "Tanıtımı yeniden izle" ile `?replay=1` açılır: o durumda
 * hedef ya da tamamlanma kaydedilmez, kapatınca geri dönülür (deneme ve test için).
 */
export default function OnboardingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === '1';
  const { saveGoal, completeOnboarding } = useGoal();
  const { isPremium, openPaywall } = useSubscription();
  const { queue: queueTour } = useTour();
  const price = useGramAskPrice();
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [goalStep, setGoalStep] = useState(false);

  const close = () => router.back();

  const finish = async (goal?: Parameters<typeof saveGoal>[0]) => {
    setSaving(true);
    try {
      if (goal) await saveGoal(goal);
      await completeOnboarding();
      // Uygulama turu, ilk paywall kapandıktan sonra ana ekranda kendiliğinden başlar.
      if (!isReplay) queueTour();
      analyticsDatasource.track({ name: 'onboarding_completed', goalSet: Boolean(goal) });
      router.replace('/(tabs)');
      // Hedefle içeri alınan kullanıcıya Pro tanıtımı: ana ekran açıldıktan sonra bir kez.
      if (!isPremium) {
        void engagementDatasource.update((st) => ({ softPaywalls: st.softPaywalls + 1, lastPaywallAt: Date.now() }));
        setTimeout(() => openPaywall('welcome'), 600);
      }
    } finally {
      setSaving(false);
    }
  };

  const goTo = (next: number) => {
    setStep(next);
    pager.current?.scrollTo({ x: next * width, animated: true });
    analyticsDatasource.track({ name: 'onboarding_step', step: next });
  };

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== step) {
      setStep(next);
      analyticsDatasource.track({ name: 'onboarding_step', step: next });
    }
  };

  if (goalStep) {
    return (
      <Screen scroll>
        <View style={styles.goalHero}>
          <AppText variant="h1">Ayda kaç gram biriktirmek istiyorsun?</AppText>
          <AppText tone="secondary">
            Kasana eklediğin her alım hedefe sayılır. İstersen şimdi atla, Kasam ekranından sonra da koyabilirsin.
          </AppText>
        </View>
        <GoalForm
          gramPrice={price}
          submitLabel="Hedefimi kaydet"
          submitting={saving}
          onSubmit={(goal) => void finish(goal)}
        />
        <AppButton label="Şimdilik atla" variant="ghost" disabled={saving} onPress={() => void finish()} />
      </Screen>
    );
  }

  const last = step === PAGE_COUNT - 1;
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Ayarlar'dan yeniden izlerken kenardan kaydırarak çıkılabilir; ilk açılışta çıkış yoktur. */}
      <Stack.Screen options={{ gestureEnabled: isReplay }} />
      <View style={styles.top} />
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettled}
        style={styles.pager}
      >
        {PAGES.map(({ Preview, title, body }) => (
          <View key={title} style={[styles.page, { width }]}>
            <View style={styles.stage}>
              <Preview />
            </View>
            <View style={styles.copy}>
              <View style={styles.titleBox}>
                <AppText variant="h1" style={styles.center}>
                  {title}
                </AppText>
              </View>
              <AppText tone="secondary" style={styles.center}>
                {body}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Sayfa ${step + 1} / ${PAGE_COUNT}`}>
          {PAGES.map((p, i) => (
            <View
              key={p.title}
              style={[styles.dot, { backgroundColor: i === step ? colors.brand.gold : colors.border.strong }, i === step && styles.dotActive]}
            />
          ))}
        </View>
        <View style={styles.buttons}>
          {step > 0 ? (
            <View style={styles.back}>
              <AppButton
                label="Geri"
                variant="secondary"
                onPress={() => goTo(step - 1)}
              />
            </View>
          ) : null}
          <View style={styles.next}>
            <AppButton
              label={last && isReplay ? 'Bitti' : 'Devam et'}
              onPress={() => {
                if (!last) return goTo(step + 1);
                if (isReplay) return close();
                setGoalStep(true);
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  top: { height: paddings.md },
  buttons: { flexDirection: 'row', gap: paddings.sm },
  back: { flex: 1 },
  next: { flex: 2 },
  pager: { flex: 1 },
  // Sayfalar aynı hizadan başlar: demo ve başlık sayfa değişince yukarı aşağı oynamaz.
  page: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: paddings.lg, paddingHorizontal: paddings.lg, paddingTop: paddings.sm },
  stage: { alignItems: 'center' },
  copy: { gap: paddings.sm, alignItems: 'center', maxWidth: 420, width: '100%', minHeight: 170 },
  titleBox: { minHeight: 64, justifyContent: 'center' },
  center: { textAlign: 'center' },
  footer: { gap: paddings.md, paddingHorizontal: paddings.lg },
  dots: { flexDirection: 'row', alignSelf: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 22 },
  goalHero: { gap: 10, paddingTop: 24 },
}));
