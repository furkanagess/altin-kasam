export enum GoldKarat {
  K14 = 14,
  K18 = 18,
  K22 = 22,
  K24 = 24,
}

export enum GoldForm {
  Gram = 'gram',
  Quarter = 'ceyrek',
  Half = 'yarim',
  Full = 'tam',
  Resat = 'resat',
  Cumhuriyet = 'cumhuriyet',
  Gremse = 'gremse',
  Ata5 = 'ata5',
  Bilezik = 'bilezik',
}

export enum MetalSymbol {
  XAU = 'XAU',
  XAG = 'XAG',
  XPT = 'XPT',
  XPD = 'XPD',
}

export enum CommunityPostKind {
  Tweet = 'tweet',
  Blog = 'blog',
  Article = 'article',
  /** Bluesky vb. sosyal ağ gönderisi. */
  Post = 'post',
  News = 'news',
}

export const GOLD_PURITY: Record<GoldKarat, number> = {
  [GoldKarat.K14]: 0.585,
  [GoldKarat.K18]: 0.75,
  [GoldKarat.K22]: 0.916,
  [GoldKarat.K24]: 0.995,
};
