/**
 * Haber başlıklarındaki fiyat yönü ifadeleri (küçük harf, Türkçe). Kelime başından
 * eşleşir; "düşün-" (düşünmek), "gerilim" (gerginlik) gibi farklı anlamlar bilinçli
 * olarak dışarıda bırakılmıştır.
 */
export const POSITIVE_TERMS =
  /(?<!\p{L})(?:yüksel\p{L}*|art(?:tı|ış\p{L}*|ıyor|acak|arak|ır\p{L}*)|rekor\p{L}*|zirve\p{L}*|tırman\p{L}*|toparlan\p{L}*|sıçra\p{L}*|uç(?:tu|uşa|uyor)\p{L}*|coş(?:tu|uyor)|parla(?:dı|ıyor|yacak)|güçlen\p{L}*|ralli\p{L}*|değer kazan\p{L}*|prim yap\p{L}*|yükseliş\p{L}*|kazanç\p{L}*)/u;

export const NEGATIVE_TERMS =
  /(?<!\p{L})(?:düş(?:tü|üş\p{L}*|üyor|ecek|erek|en|tü\p{L}*)|geriled\p{L}*|gerileme\p{L}*|gerileyen|geriliyor|değer kaybet\p{L}*|kayb\p{L}*|kayıp\p{L}*|çakıl\p{L}*|eri(?:di|yor)|zayıfla\p{L}*|baskı altında|satış baskı\p{L}*|sert satış|geri çekil\p{L}*|parlaklığını kaybet\p{L}*|dip(?!\p{L}))/u;

/** Cümleyi parçalara ayıran noktalama ve karşıtlık bağlaçları. */
export const CLAUSE_SPLIT = /[,;:.!?|–—]\s*|\s+-\s+|\s(?:ama|fakat|ancak|ise|iken|oysa)\s/u;

/** Bluesky gönderileri çoğunlukla haber botlarından; tonda haberlerden az ağırlık taşır. */
export const SENTIMENT_WEIGHTS = { news: 1, post: 0.6 } as const;

/** |skor| bu eşiği aşarsa olumlu/olumsuz; altında nötr. */
export const SENTIMENT_THRESHOLD = 0.15;
/** Yön belirten (olumlu+olumsuz) içerik bundan azsa "yetersiz veri". */
export const MIN_DIRECTIONAL_ITEMS = 3;
/** Detay ekranında yön başına listelenen en fazla başlık. */
export const MAX_DIRECTIONAL_HEADLINES = 10;
/** |skor| bu eşiği aşarsa yükseliş/düşüş göstergesi "güçlü" olur. */
export const STRONG_SIGNAL_THRESHOLD = 0.5;

/** Akışta yön belirten içeriklerin payı bunun altındaysa sinyal güveni düşük sayılır. */
export const LOW_COVERAGE_SHARE = 0.25;
/** Yüksek güven için hem bu kadar yönlü içerik hem `HIGH_COVERAGE_SHARE` pay gerekir. */
export const HIGH_CONFIDENCE_ITEMS = 10;
export const HIGH_COVERAGE_SHARE = 0.5;
/** Günlük değişimin (%) "sınırlı" / "belirgin" / "sert" sayıldığı eşikler; altı yatay. */
export const PRICE_MOVE_LEVELS = { flat: 0.2, notable: 0.5, sharp: 1.5 } as const;

/**
 * `inline`: özet cümlesinin içinde kullanılan yazım.
 * `note`: konu gündemin başındaysa özete eklenen piyasa yorumu.
 * `local`: yön değil seviye bildiren yerel fiyat konuları; yorumda makro konulardan sonra gelir.
 */
export const INSIGHT_TOPICS: { label: string; inline: string; note: string; local?: boolean; pattern: RegExp }[] = [
  {
    label: 'Fed ve faiz',
    inline: 'Fed’in faiz politikası',
    note: 'Faiz indirimi beklentisi getiri sağlamayan değerli metalleri destekler; şahin mesajlar ise reel getiriyi artırarak baskı yaratır.',
    pattern: /(?<!\p{L})(?:fed|faiz\p{L}*|powell)(?!\p{L})/u,
  },
  {
    label: 'Dolar',
    inline: 'dolar',
    note: 'Gram fiyatı ons ile dolar/TL kurunun bileşimidir; kurdaki yükseliş ons sabitken bile yerel fiyatı yukarı taşır.',
    pattern: /(?<!\p{L})dolar\p{L}*/u,
  },
  {
    label: 'Enflasyon',
    inline: 'enflasyon',
    note: 'Yüksek enflasyon verileri değer koruma talebini artırır; beklentinin altında gelen veriler bu desteği zayıflatır.',
    pattern: /(?<!\p{L})(?:enflasyon\p{L}*|tüfe)/u,
  },
  {
    label: 'Merkez bankaları',
    inline: 'merkez bankaları',
    note: 'Merkez bankalarının rezerv alımları orta vadeli talebin yapısal destekçilerinden biridir.',
    pattern: /merkez bankas\p{L}*|(?<!\p{L})rezerv\p{L}*/u,
  },
  {
    label: 'Jeopolitik gerilim',
    inline: 'jeopolitik gerilim',
    note: 'Jeopolitik riskler güvenli liman primini artırır; gerilimin yatışması bu primin hızla geri verilmesine yol açabilir.',
    pattern: /(?<!\p{L})(?:gerilim\p{L}*|savaş\p{L}*|saldırı\p{L}*|hürmüz|iran|israil|jeopolitik)/u,
  },
  {
    label: 'Seçimler',
    inline: 'seçimler',
    note: 'Seçim kaynaklı belirsizlik kısa vadede oynaklığı ve korunma amaçlı talebi artırabilir.',
    pattern: /(?<!\p{L})seçim\p{L}*/u,
  },
  {
    label: 'Güvenli liman talebi',
    inline: 'güvenli liman talebi',
    note: 'Güvenli liman vurgusu piyasada riskten kaçış eğilimine işaret eder.',
    pattern: /güvenli liman/u,
  },
  {
    label: 'Ons fiyatı',
    inline: 'ons fiyatı',
    note: 'Ons fiyatı küresel yönü belirler; yerel fiyat hareketinin ne kadarının kurdan geldiğini ayırmak için ons takibi önemlidir.',
    pattern: /(?<!\p{L})ons(?!\p{L})/u,
  },
  {
    label: 'Kapalıçarşı',
    inline: 'Kapalıçarşı',
    note: 'Kapalıçarşı fiyatlamaları yerel fiziki talebi ve alış-satış makasını yansıtır.',
    local: true,
    pattern: /kapalıçarşı/u,
  },
  {
    label: 'Gram ve çeyrek fiyatları',
    inline: 'gram ve çeyrek fiyatları',
    note: 'Akışın önemli kısmı yerel fiyat raporlamasıdır; bu içerikler yön değil seviye bilgisi taşır.',
    local: true,
    pattern: /(?:gram|çeyrek|cumhuriyet) altın/u,
  },
];
