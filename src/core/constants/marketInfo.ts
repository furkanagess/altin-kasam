/** Bilgi panelinin içeriği: başlık, kısa giriş, maddeler ve isteğe bağlı alt not. */
export type InfoContent = {
  title: string;
  intro: string;
  items: { title: string; body: string }[];
  /** En altta küçük not (ör. kaynak, yatırım tavsiyesi değildir). */
  note?: string;
};

/** Piyasa ekranı bölüm başlıklarındaki ⓘ düğmesinin açtığı açıklamalar. */
export const MARKET_INFO = {
  goldTypes: {
    title: 'Altın çeşitleri',
    intro:
      'Kuyumcularda işlem gören altın ürünlerinin anlık alış ve satış fiyatları. Bir satıra dokununca ayrıntılar açılır.',
    items: [
      { title: 'Alış', body: 'Kuyumcunun senden aldığı fiyat; altınını bozdurduğunda eline geçen tutar.' },
      { title: 'Satış', body: 'Kuyumcunun sana sattığı fiyat; altın alırken ödediğin tutar.' },
      {
        title: 'Fark (makas)',
        body: 'Satış ile alış arasındaki fark; altını alıp hemen bozdurursan kaybedeceğin tutar. Ziynet ve bileziklerde işçilik nedeniyle daha geniştir.',
      },
      {
        title: 'Eski ve yeni basım',
        body: 'Eski basım çeyrek, yarım, tam ve ata altınlar kuyumcuda genellikle yeni basımdan biraz daha düşük fiyatlanır.',
      },
      {
        title: 'Günün aralığı',
        body: 'Gün içindeki en düşük ve en yüksek alış fiyatı; çubuktaki işaret güncel fiyatın bu aralıktaki yerini gösterir.',
      },
      {
        title: 'Detay, Ekle, Alarm',
        body: 'Açılan satırdan çeşidin kendi grafiğine gidebilir, kasana ekleyebilir ya da fiyat hedefe ulaşınca bildirim almak için alarm kurabilirsin.',
      },
    ],
    note: 'Fiyatı yayımlanmayan çeşitler (18 ayar, Reşat) listede yer almaz. Kuyumcudan kuyumcuya küçük farklar olabilir.',
  },
  weeklyAnalysis: {
    title: 'Haftalık analiz',
    intro: 'Her hafta başında yayımlanan, altın ve gümüş piyasasının değerlendirildiği kısa analiz.',
    items: [
      {
        title: 'Haftalık beklenti',
        body: 'Altın ve gümüş için haftanın genel yönü: Yükseliş yönlü, Düşüş yönlü ya da Yatay.',
      },
      { title: 'Takip edilen seviyeler', body: 'Fiyatın tepki verebileceği destek ve direnç seviyeleri.' },
      {
        title: 'Takvim ve senaryolar',
        body: 'Haftanın önemli veri ve gelişmeleri ile bunlara göre olası fiyat senaryoları.',
      },
      {
        title: 'Geçmiş analizler',
        body: 'Önceki haftaların analizleri bu bölümde ve analiz ekranının altında tarihleriyle listelenir.',
      },
    ],
    note: 'Analizler bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
  },
  economicCalendar: {
    title: 'Ekonomik takvim',
    intro: 'Altın ve gümüş fiyatını en çok hareket ettiren faiz kararları ve veri açıklamaları. Saatler Türkiye saatidir.',
    items: [
      {
        title: 'Fed ve TCMB faiz kararları',
        body: 'Fed kararı onsu ve doları, TCMB kararı TL’yi etkiler; gram altın ikisinin birleşimidir.',
      },
      {
        title: 'Enflasyon ve istihdam',
        body: 'ABD verileri faiz beklentisini değiştirir; Türkiye enflasyonu değer koruma talebini ve faiz beklentisini etkiler.',
      },
      {
        title: 'Hatırlatma',
        body: 'Zil simgesine dokunursan açıklamadan 15 dakika önce bildirim gelir; uygulama kapalıyken de çalışır.',
      },
      {
        title: 'Kaynaklar',
        body: 'Tarihler Fed, ABD Çalışma İstatistikleri Bürosu, TCMB ve TÜİK’in yayımladığı takvimlerden otomatik gelir; kurum yeni dönemi duyurunca takvime eklenir.',
      },
    ],
    note: 'Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
  },
  goldSilverRatio: {
    title: 'Altın/Gümüş rasyosu',
    intro: '1 ons altının kaç ons gümüşe denk geldiğini gösterir; iki metalin birbirine göre pahalılığını ölçer.',
    items: [
      {
        title: 'Yüksek rasyo',
        body: 'Gümüş, altına göre görece ucuz. Geçmişte uç seviyelerden sonra çoğunlukla gümüş lehine ortalamaya dönüş görüldü.',
      },
      { title: 'Düşük rasyo', body: 'Altın, gümüşe göre görece ucuz.' },
      {
        title: 'Ortalama bant',
        body: 'Son 30 yılda rasyo büyük ölçüde 60–75 aralığında seyretti; ölçekteki altın rengi alan bu bandı gösterir.',
      },
    ],
    note: 'Rasyo ons altın ve ons gümüş fiyatlarından hesaplanır. Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir.',
  },
} satisfies Record<string, InfoContent>;

export type MarketInfoId = keyof typeof MARKET_INFO;
