export const COMMUNITY_HASHTAGS = [
  '#Altın',
  '#XAUUSD',
  '#Gümüş',
  '#GramAltın',
  '#ÇeyrekAltın',
] as const;

export type CommunityHashtag = (typeof COMMUNITY_HASHTAGS)[number];
