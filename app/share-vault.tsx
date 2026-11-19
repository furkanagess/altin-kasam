import { appAlert } from '@/src/core/dialog/appAlert';
import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { paddings } from '@/src/core/theme';
import { fileShareDatasource } from '@/src/data/datasources/fileShareDatasource';
import { portfolioRepository } from '@/src/data/repositories/portfolioRepository';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { PortfolioShareCard } from '@/src/widgets/organisms/PortfolioShareCard';
import React, { useMemo, useRef, useState } from 'react';
import { Switch, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Kasayı görsele çevirip paylaşır. Görsel herkese sınırsız açıktır: her paylaşım uygulamanın
 * indirme adresini taşır. Tutarları (kasa değeri, kâr/zarar) göstermek Pro'ya dahildir.
 */
export default function ShareVaultScreen() {
  const { snapshot } = usePortfolioViewModel();
  const breakdown = useMemo(() => (snapshot ? portfolioRepository.breakdown(snapshot) : null), [snapshot]);
  const [showAmounts, setShowAmounts] = useState(false);
  const [busy, setBusy] = useState(false);
  const { isPremium, openPaywall } = useSubscription();
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);

  if (!snapshot || !breakdown || !snapshot.holdings.length) {
    return (
      <Screen webWidth="readable">
        <AppText tone="secondary">Paylaşılacak bir varlık yok. Önce kasana varlık ekle.</AppText>
      </Screen>
    );
  }

  const share = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const ok = await fileShareDatasource.shareImage(uri, 'Kasamı paylaş');
      analyticsDatasource.track({ name: 'share_card_shared', ok });
      if (!ok) appAlert('Paylaşım kullanılamıyor', 'Bu cihazda paylaşım menüsü açılamadı.');
    } catch {
      appAlert('Görsel oluşturulamadı', 'Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  const toggleAmounts = (value: boolean) => {
    if (value && !isPremium) {
      openPaywall('shareImage');
      return;
    }
    setShowAmounts(value);
  };

  return (
    <Screen webWidth="readable"
      scroll
      footer={<AppButton label="Görseli paylaş" loading={busy} onPress={() => void share()} />}
    >
      <View style={{ alignItems: 'center' }}>
        <View ref={cardRef} collapsable={false}>
          <PortfolioShareCard snapshot={snapshot} breakdown={breakdown} showAmounts={showAmounts && isPremium} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: paddings.sm }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: paddings.xs }}>
            <AppText variant="bodyStrong">Tutarları göster</AppText>
            {!isPremium ? <ProMark /> : null}
          </View>
          <AppText variant="caption" tone="secondary">
            Kapalıyken kasa değeri ve kâr/zarar tutarı görselde olmaz; varlık miktarları ve yüzdeler görünür.
          </AppText>
        </View>
        <Switch value={showAmounts && isPremium} onValueChange={toggleAmounts} accessibilityLabel="Tutarları göster" />
      </View>
    </Screen>
  );
}
