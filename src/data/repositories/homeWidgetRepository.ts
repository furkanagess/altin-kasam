import type { Currency } from '@/src/core/constants/app';
import {
  DEFAULT_HOME_WIDGET_OPTION_ID,
  getHomeWidgetOption,
  SILVER_WIDGET_OPTION_ID,
} from '@/src/core/constants/homeWidget';
import { getGoldAsset } from '@/src/core/constants/goldAssets';
import { storageGet, storageSet } from '@/src/core/storage/storage';
import { homeWidgetDatasource } from '@/src/data/datasources/homeWidgetDatasource';
import { MetalSymbol } from '@/src/domain/enums';
import type { GoldRate, HomeWidgetProps, MetalQuote } from '@/src/domain/models';
import { formatMoney, formatPercent } from '@/src/utils/format';

const SELECTION_KEY = 'altin_kasam_home_widget_v1';

const timeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

type MarketView = { quotes: MetalQuote[]; goldRates: GoldRate[]; currency: Currency };

/** "Gram Altın (24 ayar)" → "GRAM ALTIN" + "24 ayar · Alış"; parantezsiz ziynette ayar varlıktan gelir. */
function widgetTitle(optionId: string, label: string): { title: string; subtitle: string } {
  const match = /^(.*?)\s*\((.+)\)$/.exec(label);
  const karat = getGoldAsset(optionId)?.karat;
  const detail = match?.[2] ?? (karat ? `${karat} ayar` : '');
  // Widget çalışma ortamında Türkçe büyük harf kuralı garanti değil ("i" → "İ"); burada çevrilir.
  const title = (match?.[1] ?? label).toLocaleUpperCase('tr-TR');
  return { title, subtitle: [detail, 'Alış'].filter(Boolean).join(' · ') };
}

function changeText(changePercent: number): string {
  return `${changePercent >= 0 ? '▲' : '▼'} ${formatPercent(Math.abs(changePercent)).replace('+', '')}`;
}

export class HomeWidgetRepository {
  private lastSent: string | null = null;

  isAvailable(): boolean {
    return homeWidgetDatasource.isAvailable();
  }

  async getSelectedOptionId(): Promise<string> {
    const id = await storageGet<string>(SELECTION_KEY);
    return id && getHomeWidgetOption(id) ? id : DEFAULT_HOME_WIDGET_OPTION_ID;
  }

  async setSelectedOptionId(id: string): Promise<void> {
    await storageSet(SELECTION_KEY, id);
  }

  /** Ücretsiz planda widget her zaman varsayılan birimi (gram altın) gösterir; seçim Pro'dur. */
  effectiveOptionId(optionId: string, isPremium: boolean): string {
    return isPremium ? optionId : DEFAULT_HOME_WIDGET_OPTION_ID;
  }

  /** Fiyat yoksa (ilk yükleme) `null`; widget eski verisini korur. */
  buildProps(optionId: string, market: MarketView, isPremium: boolean, now = new Date()): HomeWidgetProps | null {
    const id = this.effectiveOptionId(optionId, isPremium);
    const option = getHomeWidgetOption(id) ?? getHomeWidgetOption(DEFAULT_HOME_WIDGET_OPTION_ID)!;
    const metal = option.metal === MetalSymbol.XAG ? 'silver' : 'gold';
    const { title, subtitle } = widgetTitle(option.id, option.label);

    const price =
      option.id === SILVER_WIDGET_OPTION_ID
        ? market.quotes.find((q) => q.symbol === MetalSymbol.XAG)
        : market.goldRates.find((r) => r.assetId === option.id);
    if (!price) return null;

    return {
      locked: false,
      free: !isPremium,
      metal,
      title,
      subtitle,
      price: formatMoney(price.bid, market.currency),
      change: changeText(price.changePercent),
      up: price.changePercent >= 0,
      updatedAt: timeFormatter.format(now),
      url: 'altinkasam:///',
    };
  }

  /** Aynı içerik tekrar gönderilmez; widget güncellemeleri sistem bütçesinden yer. */
  push(props: HomeWidgetProps): void {
    const { updatedAt: _updatedAt, ...content } = props;
    const key = JSON.stringify(content);
    if (key === this.lastSent) return;
    this.lastSent = key;
    homeWidgetDatasource.update(props);
  }
}

export const homeWidgetRepository = new HomeWidgetRepository();
