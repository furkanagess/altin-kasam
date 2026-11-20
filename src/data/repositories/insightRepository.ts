import { mentionsMetal } from '@/src/core/constants/community';
import {
  CLAUSE_SPLIT,
  HIGH_CONFIDENCE_ITEMS,
  HIGH_COVERAGE_SHARE,
  INSIGHT_TOPICS,
  LOW_COVERAGE_SHARE,
  MAX_DIRECTIONAL_HEADLINES,
  MIN_DIRECTIONAL_ITEMS,
  NEGATIVE_TERMS,
  POSITIVE_TERMS,
  PRICE_MOVE_LEVELS,
  SENTIMENT_THRESHOLD,
  SENTIMENT_WEIGHTS,
  STRONG_SIGNAL_THRESHOLD,
} from '@/src/core/constants/insights';
import { CommunityPostKind } from '@/src/domain/enums';
import type { CommunityPost, MetalInsight, SentimentLabel, TradeSignal } from '@/src/domain/models';
import { formatPercent, formatTRY } from '@/src/utils/format';

type Topic = MetalInsight['topic'];

const METAL_TEXT: Record<Topic, { name: string; with: string; gram: string }> = {
  gold: { name: 'altın', with: 'altınla', gram: 'Gram altın' },
  silver: { name: 'gümüş', with: 'gümüşle', gram: 'Gram gümüş' },
};

const scoreFormatter = new Intl.NumberFormat('tr-TR', {
  signDisplay: 'exceptZero',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function textOf(post: CommunityPost): string {
  return `${post.title ?? ''}. ${post.body}`.toLocaleLowerCase('tr');
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`)) ?? []).length;
}

/**
 * -1, 0 veya 1. Metalden bahseden cümle parçaları değerlendirilir
 * ("Petrol düştü, altın yükseldi" altın için olumlu); hiçbiri bahsetmiyorsa tüm metin.
 */
export function scorePost(post: CommunityPost, topic: Topic): number {
  const text = textOf(post);
  const clauses = text.split(CLAUSE_SPLIT).filter((c) => c && c.trim());
  const relevant = clauses.filter((c) => mentionsMetal(c, topic));
  const scope = relevant.length ? relevant : [text];
  const sum = scope.reduce(
    (acc, clause) => acc + countMatches(clause, POSITIVE_TERMS) - countMatches(clause, NEGATIVE_TERMS),
    0,
  );
  return Math.sign(sum);
}

function signalOf(label: SentimentLabel, score: number): TradeSignal {
  if (label === 'insufficient') return 'none';
  if (label === 'neutral') return 'hold';
  const strong = Math.abs(score) >= STRONG_SIGNAL_THRESHOLD;
  if (label === 'positive') return strong ? 'strongBuy' : 'buy';
  return strong ? 'strongSell' : 'sell';
}

function weightOf(post: CommunityPost): number {
  return post.kind === CommunityPostKind.News ? SENTIMENT_WEIGHTS.news : SENTIMENT_WEIGHTS.post;
}

/** Haberler önce, sonra en yeniler. */
function byPriority(a: CommunityPost, b: CommunityPost): number {
  const newsFirst = Number(b.kind === CommunityPostKind.News) - Number(a.kind === CommunityPostKind.News);
  return newsFirst || b.publishedAt.localeCompare(a.publishedAt);
}

function share(part: number, total: number): string {
  return `%${Math.round((part / total) * 100)}`;
}

function listTr(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}` : items[0];
}

type SummaryTopic = { inline: string; note: string; local?: boolean };

/** İki paragraflık özet: ölçüm ve sinyal güvenilirliği; fiyatla karşılaştırma ve gündem yorumu. */
function buildSummary(insight: Omit<MetalInsight, 'summary'>, topics: SummaryTopic[]): string {
  const { topic, label, score, counts, analyzed, price, priceChangePercent } = insight;
  const metal = METAL_TEXT[topic];
  const directional = counts.positive + counts.negative;
  const parts: string[] = [];

  if (!analyzed) {
    return `Bugün ${metal.with} ilgili henüz haber yok; gün içinde içerik geldikçe analiz güncellenir.`;
  }

  if (label === 'insufficient') {
    parts.push(
      directional
        ? `Bugün ${metal.with} ilgili ${analyzed} içerik tarandı; yalnızca ${directional} tanesi fiyat yönüne dair ifade içeriyor (${counts.positive} yükseliş, ${counts.negative} düşüş).`
        : `Bugün ${metal.with} ilgili ${analyzed} içerik tarandı; hiçbiri fiyat yönüne dair ifade içermiyor.`,
      'Bu örneklem anlamlı bir ton ölçümü için yetersiz.',
    );
  } else if (label === 'neutral') {
    parts.push(
      `Haber akışı ${metal.name} için dengeli: yön belirten ${directional} içerikte yükseliş (${counts.positive}) ve düşüş (${counts.negative}) sinyalleri birbirini büyük ölçüde nötrlüyor; ağırlıklı ton skoru ${scoreFormatter.format(score)}.`,
      'Akış şu an net bir yön fiyatlamıyor.',
    );
  } else {
    const strength = Math.abs(score) >= STRONG_SIGNAL_THRESHOLD ? 'güçlü' : 'ılımlı';
    const direction = label === 'positive' ? 'pozitif (yükseliş yönlü)' : 'negatif (düşüş yönlü)';
    parts.push(
      `Haber akışı ${metal.name} için ${strength} ${direction} bir eğilim gösteriyor: yön belirten ${directional} içerikten ${counts.positive} tanesi (${share(counts.positive, directional)}) yükselişi, ${counts.negative} tanesi düşüşü işaret ediyor; ağırlıklı ton skoru ${scoreFormatter.format(score)} (−1 ile +1 arası).`,
    );
  }

  if (directional) {
    const coverage = directional / analyzed;
    const confidence =
      directional >= HIGH_CONFIDENCE_ITEMS && coverage >= HIGH_COVERAGE_SHARE
        ? 'yüksek'
        : coverage < LOW_COVERAGE_SHARE || directional < MIN_DIRECTIONAL_ITEMS * 2
          ? 'düşük'
          : 'orta';
    parts.push(
      `Yönlü içeriklerin toplam akıştaki payı ${share(directional, analyzed)} (${directional}/${analyzed}); sinyal güvenilirliği ${confidence}.`,
    );
  }

  // İlk paragraf haber tonu ve güvenilirliği; ikincisi fiyat hareketi ve gündem.
  const toneParts = parts.splice(0);

  if (price != null && priceChangePercent != null) {
    // Altın fiyatı tam sayıya yuvarlanmış gelir (bkz. useMarketInsights); ",00" yazılmaz.
    const priceText = formatTRY(price).replace(/,00$/, '');
    const magnitude = Math.abs(priceChangePercent);
    const priceDirection = magnitude < PRICE_MOVE_LEVELS.flat ? 0 : Math.sign(priceChangePercent);
    const move = priceDirection > 0 ? 'yükseliş' : 'düşüş';
    const movePhrase = !priceDirection
      ? 'yatay seyrediyor'
      : magnitude >= PRICE_MOVE_LEVELS.sharp
        ? `sert bir ${move} kaydediyor`
        : magnitude >= PRICE_MOVE_LEVELS.notable
          ? `belirgin bir ${move} kaydediyor`
          : `sınırlı bir ${move} kaydediyor`;
    parts.push(`${metal.gram} ${priceText} seviyesinde; günlük ${formatPercent(priceChangePercent)} ile ${movePhrase}.`);

    const toneDirection = label === 'positive' ? 1 : label === 'negative' ? -1 : 0;
    if (toneDirection && priceDirection === toneDirection) {
      parts.push('Fiyat hareketi haber tonunu teyit ediyor; ton ile momentum aynı yönde, eğilim piyasada karşılık buluyor.');
    } else if (toneDirection > 0 && priceDirection < 0) {
      parts.push(
        'Olumlu habere rağmen fiyatın gerilemesi, beklentilerin büyük ölçüde fiyatlanmış olabileceğine ya da kâr realizasyonuna işaret ediyor.',
      );
    } else if (toneDirection < 0 && priceDirection > 0) {
      parts.push(
        'Olumsuz habere rağmen fiyatın yükselmesi, geri çekilmelerin alım fırsatı olarak değerlendirildiğine ya da kur etkisinin baskın olduğuna işaret ediyor.',
      );
    } else if (toneDirection) {
      parts.push('Fiyatın yatay kalması, haber akışındaki tonun henüz fiyata yansımadığını gösteriyor.');
    } else if (magnitude >= PRICE_MOVE_LEVELS.notable) {
      parts.push('Haber akışı yön üretmezken fiyattaki hareket teknik ya da kur kaynaklı olabilir.');
    }
  }

  if (topics.length) {
    parts.push(`Gündemin merkezinde ${listTr(topics.map((t) => t.inline))} var.`);
    const byRelevance = [...topics].sort((a, b) => Number(!!a.local) - Number(!!b.local));
    parts.push(...byRelevance.slice(0, 2).map((t) => t.note));
  }

  return [toneParts.join(' '), parts.join(' ')].filter(Boolean).join('\n\n');
}

export class InsightRepository {
  /**
   * Kurallara dayalı, cihaz üzerinde çalışan analiz. Serbest metin özet için ileride bir LLM
   * sunucu tarafında bu imzanın arkasına konabilir (API anahtarı uygulamaya gömülemez).
   */
  analyze(
    topic: Topic,
    posts: CommunityPost[],
    market?: { price: number; changePercent: number },
  ): MetalInsight {
    const scored = posts.map((post) => ({ post, score: scorePost(post, topic), weight: weightOf(post) }));
    const counts = { positive: 0, negative: 0, neutral: 0 };
    let weightedPositive = 0;
    let weightedNegative = 0;
    for (const { score, weight } of scored) {
      if (score > 0) {
        counts.positive += 1;
        weightedPositive += weight;
      } else if (score < 0) {
        counts.negative += 1;
        weightedNegative += weight;
      } else {
        counts.neutral += 1;
      }
    }
    const directional = weightedPositive + weightedNegative;
    const score = directional ? (weightedPositive - weightedNegative) / directional : 0;
    const label: SentimentLabel =
      counts.positive + counts.negative < MIN_DIRECTIONAL_ITEMS
        ? 'insufficient'
        : score > SENTIMENT_THRESHOLD
          ? 'positive'
          : score < -SENTIMENT_THRESHOLD
            ? 'negative'
            : 'neutral';

    const texts = posts.map(textOf);
    const topTopics = INSIGHT_TOPICS.map((t) => ({
      ...t,
      hits: texts.filter((text) => t.pattern.test(text)).length,
    }))
      .filter((t) => t.hits >= 2)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3);
    const topics = topTopics.map((t) => t.label);

    const pick = (sign: number) =>
      scored
        .filter((s) => s.score === sign)
        .map((s) => s.post)
        .sort(byPriority)
        .slice(0, MAX_DIRECTIONAL_HEADLINES);

    const base: Omit<MetalInsight, 'summary'> = {
      topic,
      label,
      score,
      signal: signalOf(label, score),
      counts,
      analyzed: posts.length,
      price: market?.price,
      priceChangePercent: market?.changePercent,
      topics,
      topPositive: pick(1),
      topNegative: pick(-1),
    };
    return { ...base, summary: buildSummary(base, topTopics) };
  }
}

export const insightRepository = new InsightRepository();
