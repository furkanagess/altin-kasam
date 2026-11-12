import { useValueMoments } from "@/src/viewmodels/engagement/useValueMoments";
import { analyticsDatasource } from "@/src/data/datasources/analyticsDatasource";
import { PriceTimestamp } from "@/src/widgets/molecules/PriceTimestamp";
import {
  getGoldAsset,
  GOLD_ASSET_GROUPS,
  GOLD_ASSETS,
  GOLD_EDITIONS,
  goldAssetGroup,
  goldAssetInEdition,
  goldAssetShortName,
  gramGoldEquivalent,
  type GoldEdition,
} from "@/src/core/constants/goldAssets";
import {
  CASH_ASSETS,
  getOtherAsset,
  METAL_ASSETS,
  portfolioQuantityUnit,
  type OtherAssetDefinition,
} from "@/src/core/constants/portfolioAssets";
import {
  FREE_HOLDING_LIMIT,
  PAYWALL_REASON_TEXT,
} from "@/src/core/constants/premium";
import { makeStyles, paddings, radii, useTheme } from "@/src/core/theme";
import { feedbackDatasource } from "@/src/data/datasources/feedbackDatasource";
import { MetalSymbol } from "@/src/domain/enums";
import { formatDecimalInput, formatGrams, formatNumber, formatTRY, numberToInput, parseDecimalTr } from "@/src/utils/format";
import { useMarketViewModel } from "@/src/viewmodels/market/MarketProvider";
import { usePortfolioViewModel } from "@/src/viewmodels/portfolio/PortfolioProvider";
import { useSubscription } from "@/src/viewmodels/subscription/SubscriptionProvider";
import { AppButton } from "@/src/widgets/atoms/AppButton";
import { AppText } from "@/src/widgets/atoms/AppText";
import { Screen } from "@/src/widgets/atoms/Screen";
import type { CardQuantity } from "@/src/widgets/molecules/CardQuantityControl";
import { GoldAssetCard } from "@/src/widgets/molecules/GoldAssetCard";
import { OtherAssetCard } from "@/src/widgets/molecules/OtherAssetCard";
import { QuantityStepper } from "@/src/widgets/molecules/QuantityStepper";
import { ScrollRow } from "@/src/widgets/molecules/ScrollRow";
import { SectionHeader } from "@/src/widgets/molecules/SectionHeader";
import { VaultDropAnimation } from "@/src/widgets/organisms/VaultDropAnimation";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

const parseNumber = parseDecimalTr;

const OTHER_GROUPS: { id: string; label: string; assets: OtherAssetDefinition[] }[] = [
  { id: "metal", label: "Gümüş ve diğer metaller", assets: METAL_ASSETS },
  { id: "cash", label: "Nakit", assets: CASH_ASSETS },
];

/** Nakit seçilince miktar tutar olarak başlar (1 dolar eklemek nadirdir). */
const CASH_DEFAULT_QUANTITY = "1000";
const CASH_STEP = 100;

export default function AddHoldingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { quotes, goldRates, fxRates } = useMarketViewModel();
  const { addHolding, holdings } = usePortfolioViewModel();
  const { isPremium, openPaywall } = useSubscription();
  const { reach } = useValueMoments();
  /** Kayıttan sonra oynayan kasa animasyonu; bitince ekran kapanır. */
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string; assetId: string } | null>(null);
  // Eklenen kalem sınırı doldurabilir; animasyon sürerken sınır ekranına geçilmez.
  const limitReached = !celebration && !isPremium && holdings.length >= FREE_HOLDING_LIMIT;
  const params = useLocalSearchParams<{ assetId?: string }>();
  const initialId =
    getGoldAsset(params.assetId ?? "")?.id ??
    getOtherAsset(params.assetId ?? "")?.id ??
    getGoldAsset("ceyrek-22")?.id ??
    GOLD_ASSETS[0].id;
  const [assetId, setAssetId] = useState(initialId);
  /** Her varlığın kendi miktarı vardır; kartlar arasında geçince birbirini etkilemez. */
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const quantityOf = (id: string) =>
    quantities[id] ?? (getOtherAsset(id)?.kind === "cash" ? CASH_DEFAULT_QUANTITY : "1");
  const quantity = quantityOf(assetId);
  const setQuantity = (value: string) => setQuantities((all) => ({ ...all, [assetId]: value }));
  /** null: güncel satış fiyatı / kur kullanılır; metin: kullanıcının girdiği birim fiyat. */
  const [customPrice, setCustomPrice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gold = getGoldAsset(assetId);
  const other = getOtherAsset(assetId);
  const cash = other?.kind === "cash" ? other : null;
  const tryCash = cash?.currency === "TRY";
  const [edition, setEdition] = useState<GoldEdition>(gold?.edition ?? "yeni");
  const unit = portfolioQuantityUnit(assetId);

  /** Birim satış fiyatı (TRY): altında ürün fiyatı (yoksa gram fiyatından yaklaşık), metalde gram, nakitte kur. */
  const askFor = useCallback(
    (id: string): number => {
      const target = getGoldAsset(id);
      if (target) {
        const marketAsk = goldRates.find((r) => r.assetId === id)?.ask;
        if (marketAsk) return Number(marketAsk.toFixed(2));
        const xau = quotes.find((q) => q.symbol === MetalSymbol.XAU)?.bid ?? 0;
        return xau > 0 ? Number((xau * target.gramWeight * target.purity).toFixed(2)) : 0;
      }
      const otherAsset = getOtherAsset(id);
      if (!otherAsset) return 0;
      if (otherAsset.kind === "metal") {
        const ask = quotes.find((q) => q.symbol === otherAsset.metal)?.ask ?? 0;
        return Number(ask.toFixed(2));
      }
      if (otherAsset.currency === "TRY") return 1;
      return Number((fxRates[otherAsset.currency] ?? 0).toFixed(4));
    },
    [goldRates, quotes, fxRates],
  );

  const marketPrice = askFor(assetId);
  const unitPrice = tryCash ? 1 : customPrice == null ? marketPrice : parseNumber(customPrice);
  const qty = parseNumber(quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;
  const priceValid = Number.isFinite(unitPrice) && unitPrice > 0;
  const total = qtyValid && priceValid ? qty * unitPrice : 0;
  const goldGrams = qtyValid ? gramGoldEquivalent(assetId) * qty : 0;

  const goldGroups = useMemo(
    () =>
      GOLD_ASSET_GROUPS.map((g) => {
        const all = GOLD_ASSETS.filter((a) => goldAssetGroup(a) === g.id);
        return {
          ...g,
          hasEditions: all.some((a) => a.edition === "eski"),
          // Basımı olmayan ürünler (reşat) iki seçimde de görünür; eski seçimde sona alınır.
          assets: all
            .filter((a) => (a.edition ?? edition) === edition)
            .sort((a, b) => (edition === "eski" ? Number(!a.edition) - Number(!b.edition) : 0)),
        };
      }),
    [edition],
  );

  const selectAsset = (id: string) => {
    // Aynı varlığa yeniden dokunmak titreşim vermez.
    if (id !== assetId) feedbackDatasource.select();
    setAssetId(id);
    // Önceki ürün için girilmiş fiyat yeni ürüne uymaz.
    setCustomPrice(null);
    setError(null);
  };

  /** Seçili ziynet diğer basımına geçer (çeyrek ↔ eski çeyrek). */
  const selectEdition = (next: GoldEdition) => {
    setEdition(next);
    if (!gold) return;
    const counterpart = goldAssetInEdition(gold, next);
    if (counterpart.id !== gold.id) selectAsset(counterpart.id);
  };

  // Her kartın kendi − / + sayacı vardır; dokunulan kart seçilir. Alttaki alan seçili kartın miktarını gösterir.
  const stepFor = (id: string): number => (getOtherAsset(id)?.kind === "cash" ? CASH_STEP : 1);
  const stepQuantity = (id: string, direction: 1 | -1) => {
    const current = parseNumber(quantityOf(id));
    const base = Number.isFinite(current) && current > 0 ? current : 0;
    const next = Math.round((base + direction * stepFor(id)) * 100) / 100;
    if (next <= 0) return;
    if (direction === 1) feedbackDatasource.quantityUp();
    else feedbackDatasource.quantityDown();
    setQuantities((all) => ({ ...all, [id]: numberToInput(next, 4) }));
    if (id !== assetId) selectAsset(id);
  };
  const cardQuantityFor = (id: string): CardQuantity => {
    const value = parseNumber(quantityOf(id));
    const valid = Number.isFinite(value) && value > 0;
    return {
      label: valid ? formatNumber(value) : "0",
      unit: portfolioQuantityUnit(id),
      canDecrement: valid && value - stepFor(id) > 0,
      onIncrement: () => stepQuantity(id, 1),
      onDecrement: () => stepQuantity(id, -1),
    };
  };
  const step = stepFor(assetId);

  const shortName = gold ? goldAssetShortName(gold) : (other?.shortName ?? "");
  const question = cash
    ? `Ne kadar ${tryCash ? shortName : shortName.toLocaleLowerCase("tr")}?`
    : other
      ? `Kaç gram ${shortName.toLocaleLowerCase("tr")}?`
      : unit === "gram"
        ? "Kaç gram?"
        : `Kaç ${shortName.toLocaleLowerCase("tr")}?`;
  const priceLabel = cash ? "Alış kuru" : other ? "Gram alış fiyatı" : "Birim alış fiyatı";
  const priceHint =
    customPrice == null
      ? cash
        ? "Güncel kur"
        : other
          ? "Güncel satış fiyatı"
          : "Güncel kuyumcu satış fiyatı"
      : cash
        ? "Kendi girdiğin kur"
        : "Kendi girdiğin fiyat";
  const summaryLine = cash
    ? tryCash
      ? `${quantity} ₺`
      : `${quantity} ${cash.symbol} × ${formatTRY(unitPrice)}`
    : other
      ? `${quantity} gram ${shortName.toLocaleLowerCase("tr")} × ${formatTRY(unitPrice)}`
      : `${unit === "gram" ? `${quantity} gram ${gold?.karat} ayar` : `${quantity} ${shortName.toLocaleLowerCase("tr")}`} × ${formatTRY(unitPrice)}${
          assetId !== "gram-24" ? ` · ≈ ${formatGrams(goldGrams)} gram altın karşılığı` : ""
        }`;

  const amountText = cash
    ? `${formatNumber(qty)} ${tryCash ? "₺" : cash.symbol}`
    : other
      ? `${formatNumber(qty)} gram ${shortName.toLocaleLowerCase("tr")}`
      : unit === "gram"
        ? `${formatNumber(qty)} gram ${gold?.karat} ayar`
        : `${formatNumber(qty)} ${shortName.toLocaleLowerCase("tr")}`;

  /** Kayıttan sonra Kasam sekmesine (history bazen Piyasa'ya düşüyor). */
  const leave = () => {
    router.replace("/portfolio");
    // Kasa ekranı açıldıktan sonra, uygunsa Pro tanıtımı ya da puan isteği.
    void reach("holding_added", 900);
  };

  const onSave = async () => {
    if (celebration) return;
    if (!qtyValid) {
      setError(cash ? "Geçerli bir tutar gir" : unit === "gram" ? "Geçerli bir gram miktarı gir" : "Geçerli bir adet gir");
      return;
    }
    if (!priceValid) {
      setError("Piyasa fiyatı henüz hazır değil; birkaç saniye sonra tekrar dene veya fiyat gir.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addHolding({ assetId, quantity: qty, costBasisPerUnit: unitPrice });
      analyticsDatasource.track({
        name: "holding_added",
        group: gold ? "gold" : cash ? "cash" : "metal",
        first: holdings.length === 0,
      });
      setCelebration({ title: "Kasaya eklendi", subtitle: `${amountText} · ${formatTRY(total)}`, assetId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  if (limitReached) {
    return (
      <Screen scroll>
        <SectionHeader title="Varlık ekle" subtitle="Ücretsiz plan sınırına ulaştın" />
        <View style={styles.limit}>
          <AppText tone="secondary">{PAYWALL_REASON_TEXT.holdings} Pro ile sınır kalkar.</AppText>
        </View>
        <AppButton label="Pro’yu incele" onPress={() => openPaywall("holdings")} />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="Kasaya ekle"
          loading={saving}
          disabled={saving || !total || !!celebration}
          onPress={() => {
            void onSave();
          }}
        />
      }
    >
      {goldGroups.map((group) => (
        <View key={group.id} style={styles.group}>
          <View style={styles.groupHeader}>
            <AppText variant="h3">{group.label}</AppText>
            {group.hasEditions ? (
              <View style={styles.editions} role="radiogroup" aria-label="Basım">
                {GOLD_EDITIONS.map((e) => {
                  const active = e.id === edition;
                  return (
                    <Pressable
                      key={e.id}
                      onPress={() => selectEdition(e.id)}
                      style={[styles.edition, active && styles.editionActive]}
                      role="radio"
                      aria-checked={active}
                      accessibilityLabel={`${e.label} basım`}
                      hitSlop={6}
                    >
                      <AppText variant="caption" tone={active ? "primary" : "secondary"}>
                        {e.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
          <ScrollRow
            style={styles.row}
            contentContainerStyle={styles.rowContent}
            arrowInset={paddings.xs}
            role="radiogroup"
            aria-label={group.label}
          >
            {group.assets.map((a) => (
              <GoldAssetCard
                key={a.id}
                asset={a}
                price={askFor(a.id) || undefined}
                selected={a.id === assetId}
                onSelect={selectAsset}
                quantity={cardQuantityFor(a.id)}
              />
            ))}
          </ScrollRow>
        </View>
      ))}

      {OTHER_GROUPS.map((group) => (
        <View key={group.id} style={styles.group}>
          <AppText variant="h3">{group.label}</AppText>
          <ScrollRow
            style={styles.row}
            contentContainerStyle={styles.rowContent}
            arrowInset={paddings.xs}
            role="radiogroup"
            aria-label={group.label}
          >
            {group.assets.map((a) => (
              <OtherAssetCard
                key={a.id}
                asset={a}
                price={a.kind === "cash" && a.currency === "TRY" ? undefined : askFor(a.id) || undefined}
                selected={a.id === assetId}
                onSelect={selectAsset}
                quantity={cardQuantityFor(a.id)}
              />
            ))}
          </ScrollRow>
        </View>
      ))}

      <View style={styles.group}>
        <AppText variant="h3">{question}</AppText>
        <QuantityStepper value={quantity} onChange={setQuantity} unit={unit} step={step} />
      </View>

      {tryCash ? null : (
        <>
          <View style={styles.priceRow}>
            <View style={styles.priceCopy}>
              <AppText variant="caption" tone="secondary">
                {priceLabel}
              </AppText>
              <AppText variant="bodyStrong">
                {priceValid ? formatTRY(unitPrice) : customPrice == null ? "Fiyat yükleniyor…" : "—"}
              </AppText>
              <AppText variant="caption" tone="tertiary">
                {priceHint}
              </AppText>
              {customPrice == null ? <PriceTimestamp /> : null}
            </View>
            <Pressable
              onPress={() =>
                setCustomPrice(
                  customPrice == null ? (marketPrice ? numberToInput(marketPrice, 2, 2) : "") : null,
                )
              }
              accessibilityRole="button"
              hitSlop={8}
            >
              <AppText variant="caption" tone="gold">
                {customPrice == null
                  ? cash
                    ? "Farklı kurdan aldım"
                    : "Farklı fiyattan aldım"
                  : cash
                    ? "Güncel kuru kullan"
                    : "Güncel fiyatı kullan"}
              </AppText>
            </Pressable>
          </View>
          {customPrice != null ? (
            <TextInput
              value={customPrice}
              onChangeText={(t) => setCustomPrice(formatDecimalInput(t, customPrice ?? ''))}
              keyboardType="decimal-pad"
              autoFocus
              style={styles.input}
              placeholder={cash ? "Kur (TRY)" : "Birim fiyat (TRY)"}
              placeholderTextColor={colors.text.tertiary}
              accessibilityLabel={priceLabel}
            />
          ) : null}
        </>
      )}

      <View style={styles.summary}>
        <AppText variant="caption" tone="secondary">
          Toplam
        </AppText>
        <AppText variant="price">{total ? formatTRY(total) : "—"}</AppText>
        {total ? (
          <AppText variant="caption" tone="tertiary">
            {summaryLine}
          </AppText>
        ) : null}
      </View>

      {error ? (
        <AppText tone="down" variant="caption">
          {error}
        </AppText>
      ) : null}

      {celebration ? (
        <VaultDropAnimation
          title={celebration.title}
          subtitle={celebration.subtitle}
          assetId={celebration.assetId}
          onDone={leave}
        />
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  limit: {
    padding: paddings.card,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
  },
  group: { gap: 8 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  editions: {
    flexDirection: "row",
    padding: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.muted,
  },
  edition: {
    paddingHorizontal: paddings.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  editionActive: {
    backgroundColor: colors.surface.elevated,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  // Satır ekran kenarlarına kadar kayar; ilk ve son kart sayfa kenar boşluğuyla hizalı kalır.
  row: { marginHorizontal: -paddings.screen },
  rowContent: { gap: 8, paddingHorizontal: paddings.screen },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  priceCopy: { flex: 1, gap: 2 },
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
  summary: {
    gap: 2,
    padding: paddings.card,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
  },
}));
