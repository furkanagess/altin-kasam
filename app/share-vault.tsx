import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { paddings } from '@/src/core/theme';
import { fileShareDatasource } from '@/src/data/datasources/fileShareDatasource';
import { portfolioRepository } from '@/src/data/repositories/portfolioRepository';
import { useProGate } from '@/src/viewmodels/subscription/useProGate';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { PortfolioShareCard } from '@/src/widgets/organisms/PortfolioShareCard';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** Kasayı görsele çevirip paylaşır. Tutarlar varsayılan olarak gizlidir. */
export default function ShareVaultScreen() {
  const { snapshot } = usePortfolioViewModel();
  const breakdown = useMemo(() => (snapshot ? portfolioRepository.breakdown(snapshot) : null), [snapshot]);
  const [showAmounts, setShowAmounts] = useState(false);
  const [busy, setBusy] = useState(false);
  const { guard, consume } = useProGate('image');
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);

  if (!snapshot || !breakdown || !snapshot.holdings.length) {
    return (
      <Screen>
        <AppText tone="secondary">Paylaşılacak bir varlık yok. Önce kasana varlık ekle.</AppText>
      </Screen>
    );
  }

  const share = async () => {
    if (!cardRef.current || !(await guard())) return;
    setBusy(true);
    try {
      await consume();
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const ok = await fileShareDatasource.shareImage(uri, 'Kasamı paylaş');
      analyticsDatasource.track({ name: 'share_card_shared', ok });
      if (!ok) Alert.alert('Paylaşım kullanılamıyor', 'Bu cihazda paylaşım menüsü açılamadı.');
    } catch {
      Alert.alert('Görsel oluşturulamadı', 'Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      footer={<AppButton label="Görseli paylaş" loading={busy} onPress={() => void share()} />}
    >
      <View style={{ alignItems: 'center' }}>
        <View ref={cardRef} collapsable={false}>
          <PortfolioShareCard snapshot={snapshot} breakdown={breakdown} showAmounts={showAmounts} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: paddings.sm }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">Tutarları göster</AppText>
          <AppText variant="caption" tone="secondary">
            Kapalıyken kasa değeri ve kâr/zarar tutarı görselde olmaz; varlık miktarları ve yüzdeler görünür.
          </AppText>
        </View>
        <Switch value={showAmounts} onValueChange={setShowAmounts} accessibilityLabel="Tutarları göster" />
      </View>
    </Screen>
  );
}
