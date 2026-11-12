import { engagementDatasource } from '@/src/data/datasources/engagementDatasource';

/** Kullanıcının değer gördüğü anlar. Yalnızca bu anlarda paywall ya da puan isteği düşünülür. */
export type ValueMoment = 'holding_added' | 'alarm_created' | 'alarm_triggered';
export type PromptDecision = 'paywall' | 'review' | null;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Kurallar tek yerde: ayar değiştirmek için yalnızca bu sabitleri değiştir. */
export const PROMPT_RULES = {
  /** İlk oturumlarda hiçbir şey istenmez: önce değer görülsün. */
  minSessions: 3,
  minInstallAgeDays: 2,
  /** Pro tanıtımı: en çok bu kadar kez ve iki gösterim arasında en az bu kadar gün. */
  maxSoftPaywalls: 3,
  paywallCooldownDays: 7,
  /** Puan isteği, son paywall'dan bu kadar gün sonra. */
  reviewAfterPaywallDays: 1,
  /** Puan için "değer" eşiği: bu kadar varlık eklenmiş olmalı (alarm tetiklenince eşik aranmaz). */
  reviewMinHoldings: 3,
  /** Pro tanıtımı için ilk değer işareti. */
  paywallMinHoldings: 2,
} as const;

/**
 * Bir değer anı gerçekleşince ne yapılacağını söyler. Aynı anda hem paywall hem puan istenmez;
 * puan (olumlu an) önceliklidir. Premium kullanıcıya paywall gösterilmez.
 */
export async function decideAtMoment(moment: ValueMoment, isPremium: boolean): Promise<PromptDecision> {
  const now = Date.now();
  const state = await engagementDatasource.update((s) => ({
    holdingsAdded: s.holdingsAdded + (moment === 'holding_added' ? 1 : 0),
    alarmsCreated: s.alarmsCreated + (moment === 'alarm_created' ? 1 : 0),
    alarmsTriggered: s.alarmsTriggered + (moment === 'alarm_triggered' ? 1 : 0),
  }));

  const ageDays = (now - state.installAt) / DAY_MS;
  const settled = state.sessions >= PROMPT_RULES.minSessions && ageDays >= PROMPT_RULES.minInstallAgeDays;
  if (!settled) return null;

  const sinceLastPaywallDays = (now - state.lastPaywallAt) / DAY_MS;

  const reviewMoment =
    moment === 'alarm_triggered' ||
    (moment === 'holding_added' && state.holdingsAdded >= PROMPT_RULES.reviewMinHoldings);
  if (!state.reviewAsked && reviewMoment && sinceLastPaywallDays >= PROMPT_RULES.reviewAfterPaywallDays) {
    return 'review';
  }

  const paywallMoment =
    moment === 'alarm_created' ||
    (moment === 'holding_added' && state.holdingsAdded >= PROMPT_RULES.paywallMinHoldings);
  if (
    !isPremium &&
    paywallMoment &&
    state.softPaywalls < PROMPT_RULES.maxSoftPaywalls &&
    sinceLastPaywallDays >= PROMPT_RULES.paywallCooldownDays
  ) {
    await engagementDatasource.update((s) => ({ softPaywalls: s.softPaywalls + 1, lastPaywallAt: now }));
    return 'paywall';
  }
  return null;
}
