// Mağaza ekran görüntüleri (1206×2622): her biri HTML olarak üretilir, headless Chrome ile PNG'ye çevrilir.
// Çalıştırma: node store-assets/screenshots/src/build.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const OUT = path.resolve(HERE, '..');
const HTML_DIR = path.join(HERE, 'html');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1206;
const H = 2622;

const img = (name) => pathToFileURL(path.join(ROOT, 'assets/images/onboarding', name)).href;

const LOGO = `<svg viewBox="236 352 552 332" width="54" height="33"><polygon points="292,442 732,442 680,360 344,360" fill="#F6DD98" stroke="#F6DD98" stroke-width="28" stroke-linejoin="round"/><polygon points="236,676 788,676 732,442 292,442" fill="#E2B04A" stroke="#E2B04A" stroke-width="28" stroke-linejoin="round"/><circle cx="512" cy="536" r="40" fill="#0F1216"/><polygon points="497,556 527,556 541,622 483,622" fill="#0F1216" stroke="#0F1216" stroke-width="10" stroke-linejoin="round"/></svg>`;

const spark = (pts, w, h, color, fill = true) => {
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * w, h - ((p - min) / (max - min || 1)) * (h - 6) - 3]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const id = `g${Math.random().toString(36).slice(2, 7)}`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${fill ? `<path d="${d} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/>` : ''}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${xy.at(-1)[0]}" cy="${xy.at(-1)[1]}" r="4" fill="${color}"/>
    <circle cx="${xy.at(-1)[0]}" cy="${xy.at(-1)[1]}" r="9" fill="${color}" opacity=".25"/>
  </svg>`;
};

const coin = (size, label = '', tone = 'gold') => {
  const c = tone === 'silver' ? ['#F1F3F6', '#B9C0CA', '#7D8692'] : ['#FBE7A1', '#E3B23C', '#9A6B12'];
  return `<div class="coin" style="width:${size}px;height:${size}px;background:radial-gradient(circle at 32% 28%, ${c[0]}, ${c[1]} 55%, ${c[2]});font-size:${size * 0.3}px">${label}</div>`;
};

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  font-family: -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
  background: #0E1115; color: #F2EEE6; position: relative; -webkit-font-smoothing: antialiased;
}
.bg { position: absolute; inset: 0; background:
  radial-gradient(900px 700px at 50% 30%, rgba(226,176,74,.22), transparent 70%),
  radial-gradient(700px 600px at 85% 95%, rgba(226,176,74,.10), transparent 70%),
  linear-gradient(180deg, #161A21 0%, #0E1115 60%); }
.rays { position: absolute; left: 50%; top: 780px; width: 2400px; height: 2400px; margin-left: -1200px; margin-top: -1200px; opacity: .5;
  background: repeating-conic-gradient(from 0deg, rgba(242,195,92,.10) 0deg 4deg, transparent 4deg 30deg);
  -webkit-mask: radial-gradient(circle, #000 0%, transparent 62%); }
.head { position: absolute; top: 150px; left: 0; right: 0; text-align: center; padding: 0 90px; z-index: 5; }
.brand { display: inline-flex; align-items: center; gap: 16px; padding: 14px 30px 14px 22px; border-radius: 999px;
  background: rgba(255,255,255,.06); border: 1.5px solid rgba(242,195,92,.35); font-size: 34px; font-weight: 700; letter-spacing: .5px; color: #F2EEE6; }
h1 { margin-top: 56px; font-size: 104px; line-height: 1.06; font-weight: 800; letter-spacing: -2.5px; }
h1 em { font-style: normal; background: linear-gradient(180deg, #FBE7A1, #E2B04A 60%, #C8922E); -webkit-background-clip: text; color: transparent; }
.sub { margin: 36px auto 0; max-width: 960px; font-size: 44px; line-height: 1.32; color: #AEB6C2; font-weight: 500; }

.phone { position: absolute; left: 50%; top: 940px; width: 940px; height: 1900px; margin-left: -470px; z-index: 3;
  border-radius: 132px; background: #05070A; padding: 22px;
  box-shadow: 0 0 0 3px #3A3F48, 0 0 0 9px #1A1D22, 0 60px 160px rgba(0,0,0,.65), 0 0 220px rgba(226,176,74,.18); }
.screen { width: 100%; height: 100%; border-radius: 112px; overflow: hidden; background: #121417; position: relative; }
.island { position: absolute; top: 30px; left: 50%; width: 250px; height: 74px; margin-left: -125px; background: #000; border-radius: 40px; z-index: 9; }
.ui { zoom: 2.3; padding: 0 16px; }
.status { height: 54px; display: flex; align-items: center; justify-content: space-between; padding: 6px 22px 0; font-size: 16px; font-weight: 600; }
.status .r { display: flex; gap: 6px; align-items: center; }
.bars { display: flex; gap: 2px; align-items: flex-end; } .bars i { width: 3px; background: #F2EEE6; border-radius: 1px; display: block; }
.batt { width: 24px; height: 12px; border: 1.5px solid #F2EEE6; border-radius: 4px; padding: 1.5px; } .batt i { display: block; height: 100%; width: 80%; background: #F2EEE6; border-radius: 1.5px; }
.nav { display: flex; align-items: center; justify-content: space-between; padding: 8px 2px 14px; }
.nav h2 { font-size: 30px; font-weight: 800; letter-spacing: -.5px; }
.chipbtn { width: 36px; height: 36px; border-radius: 18px; background: #1C1F24; display: flex; align-items: center; justify-content: center; }
.card { background: #1C1F24; border: 1px solid #2E333B; border-radius: 20px; padding: 16px; }
.gold-card { background: linear-gradient(160deg, #2A2419, #1C1F24 70%); border-color: rgba(212,166,79,.45); }
.muted { color: #AEB6C2; } .tert { color: #7E8794; } .up { color: #3FB97A; } .down { color: #F06A5E; } .gold { color: #E2B866; }
.cap { font-size: 12px; font-weight: 600; letter-spacing: .8px; color: #7E8794; text-transform: uppercase; }
.row { display: flex; align-items: center; gap: 12px; }
.between { justify-content: space-between; }
.coin { border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #5A3D08; font-weight: 900; flex-shrink: 0;
  box-shadow: inset 0 -2px 0 rgba(0,0,0,.2), inset 0 2px 0 rgba(255,255,255,.4); }
.pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 999px; font-size: 12px; font-weight: 800; }
.pill.up { background: #16372A; } .pill.down { background: #3A1D1B; } .pill.gold { background: rgba(212,166,79,.18); }
.list .item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #2A2E35; }
.list .item:last-child { border-bottom: 0; }
.t { font-size: 16px; font-weight: 700; } .s { font-size: 13px; color: #AEB6C2; margin-top: 2px; }
.num { font-variant-numeric: tabular-nums; }
.tabbar { position: absolute; left: 0; right: 0; bottom: 0; height: 200px; background: rgba(18,20,23,.96); border-top: 2px solid #2A2E35; display: flex; justify-content: space-around; padding-top: 26px; z-index: 8; }
.tabbar div { display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 26px; font-weight: 600; color: #7E8794; }
.tabbar div.on { color: #E2B866; } .tabbar i { width: 50px; height: 50px; border-radius: 14px; border: 5px solid currentColor; display: block; }
.float { position: absolute; z-index: 10; }
.callout { background: rgba(28,31,36,.92); border: 2px solid rgba(242,195,92,.55); border-radius: 44px; padding: 30px 38px; box-shadow: 0 40px 100px rgba(0,0,0,.55); backdrop-filter: blur(20px); }
.live { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; color: #AEB6C2; }
.live i { width: 7px; height: 7px; border-radius: 4px; background: #3FB97A; box-shadow: 0 0 0 4px rgba(63,185,122,.25); display: block; }
`;

const statusBar = `<div class="status"><span>9:41</span><span class="r"><span class="bars"><i style="height:5px"></i><i style="height:7px"></i><i style="height:9px"></i><i style="height:11px"></i></span><span class="batt"><i></i></span></span></div>`;

const tabbar = (on) => `<div class="tabbar">${['Piyasa', 'Kasam', 'Analiz', 'Topluluk']
  .map((t) => `<div class="${t === on ? 'on' : ''}"><i></i>${t}</div>`)
  .join('')}</div>`;

/** Başlık görseli de aynı telefon arayüzlerini kullanır; her ekranın UI'si sırayla saklanır. */
const UI_LIST = [];
const phoneHtml = (ui, tab) =>
  `<div class="screen"><div class="island"></div><div class="ui">${statusBar}${ui}</div>${tab ? tabbar(tab) : ''}</div>`;

const page = ({ title, sub, ui, tab, extra = '' }) => (UI_LIST.push({ ui, tab }), `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="bg"></div><div class="rays"></div>
<div class="head"><div class="brand">${LOGO}Altın Kasam</div><h1>${title}</h1><p class="sub">${sub}</p></div>
<div class="phone">${phoneHtml(ui, tab)}</div>
${extra}
</body></html>`);

/* ---------- 1. Kasa ---------- */
const vault = page({
  title: 'Altın birikimini<br><em>tek kasada</em> takip et',
  sub: 'Gram, çeyrek, bilezik ve gümüş: değerini ve kârını otomatik hesaplarız.',
  tab: 'Kasam',
  ui: `
  <div class="nav"><h2>Kasam</h2><div class="chipbtn gold" style="font-size:22px;font-weight:700">+</div></div>
  <div class="card gold-card">
    <div class="cap">Toplam değer</div>
    <div class="num" style="font-size:38px;font-weight:800;letter-spacing:-1px;margin-top:6px">₺412.850</div>
    <div class="row" style="margin-top:6px"><span class="pill up num">▲ ₺38.420</span><span class="up" style="font-size:14px;font-weight:700">%10,3 kâr</span></div>
    <div style="margin-top:14px">${spark([20, 22, 21, 25, 24, 28, 27, 31, 30, 34, 36, 35, 39, 42], 326, 70, '#E2B866')}</div>
  </div>
  <div class="card" style="margin-top:12px">
    <div class="row between"><span class="t">Aylık hedef</span><span class="gold" style="font-weight:800;font-size:14px">8 / 10 g</span></div>
    <div style="height:10px;background:#2A2E35;border-radius:6px;margin-top:10px;overflow:hidden"><div style="width:80%;height:100%;background:linear-gradient(90deg,#C8922E,#F2C35C);border-radius:6px"></div></div>
  </div>
  <div class="card list" style="margin-top:12px;padding:4px 16px">
    ${[
      ['24', 'Gram Altın (24 ayar)', '25 g', '₺153.750', '+%12,4'],
      ['Ç', 'Çeyrek Altın', '6 adet', '₺62.400', '+%9,8'],
      ['B', 'Bilezik (22 ayar)', '20 g', '₺112.300', '+%8,1'],
      ['C', 'Cumhuriyet Altını', '2 adet', '₺84.400', '+%11,2'],
    ]
      .map(
        ([l, n, q, v, p]) => `<div class="item">${coin(40, l)}<div style="flex:1"><div class="t">${n}</div><div class="s">${q}</div></div><div style="text-align:right"><div class="t num">${v}</div><div class="up num" style="font-size:13px;font-weight:700;margin-top:2px">${p}</div></div></div>`,
      )
      .join('')}
    <div class="item">${coin(40, 'Ag', 'silver')}<div style="flex:1"><div class="t">Gümüş</div><div class="s">250 g</div></div><div style="text-align:right"><div class="t num">₺18.950</div><div class="up num" style="font-size:13px;font-weight:700;margin-top:2px">+%6,5</div></div></div>
  </div>`,
  extra: `<div class="float callout" style="left:40px;top:1560px;transform:rotate(-4deg)">
    <div style="font-size:30px;color:#AEB6C2;font-weight:600">Bu ayki kazanç</div>
    <div class="num" style="font-size:76px;font-weight:800;color:#3FB97A;letter-spacing:-1px">+₺38.420</div></div>`,
});

/* ---------- 2. Canlı fiyat ---------- */
const prices = page({
  title: '<em>Canlı</em> gram altın ve<br>çeyrek fiyatları',
  sub: 'Kuyumcuya gitmeden alış ve satış fiyatını anında gör, saati hep yanında.',
  tab: 'Piyasa',
  ui: `
  <div class="nav"><h2>Piyasa</h2><span class="live"><i></i>CANLI · 09:41</span></div>
  <div class="card gold-card">
    <div class="row">${coin(46, '24')}<div style="flex:1"><div class="t" style="font-size:18px">Gram Altın</div><div class="s">24 ayar · satış</div></div><span class="pill up num">▲ %1,24</span></div>
    <div class="num" style="font-size:42px;font-weight:800;letter-spacing:-1px;margin-top:12px">₺6.148,25</div>
    <div class="row" style="gap:18px;margin-top:2px;font-size:13px"><span class="muted">Alış <b class="num" style="color:#F2EEE6">₺6.092,10</b></span><span class="muted">Güncellendi <b style="color:#F2EEE6">09:41:07</b></span></div>
    <div style="margin-top:14px">${spark([50, 48, 52, 51, 55, 53, 58, 57, 56, 61, 60, 64, 63, 67, 70], 326, 96, '#E2B866')}</div>
    <div class="row" style="gap:6px;margin-top:12px">${['1G', '1H', '1A', '3A', '1Y'].map((t, i) => `<span class="pill ${i === 0 ? 'gold' : ''}" style="flex:1;justify-content:center;${i === 0 ? 'color:#E2B866' : 'color:#7E8794;background:#24282E'}">${t}</span>`).join('')}</div>
  </div>
  <div class="card list" style="margin-top:12px;padding:4px 16px">
    ${[
      ['Ç', 'Çeyrek Altın', '₺10.040', '₺10.180', '+%1,1', 1],
      ['Y', 'Yarım Altın', '₺20.080', '₺20.360', '+%1,1', 1],
      ['T', 'Tam Altın', '₺40.050', '₺40.620', '+%0,9', 1],
      ['B', 'Bilezik 22 ayar', '₺5.540', '₺5.690', '+%1,2', 1],
      ['Ag', 'Gümüş (gram)', '₺72,40', '₺75,80', '−%0,4', 0],
    ]
      .map(
        ([l, n, b, s, p, up]) => `<div class="item">${coin(38, l, l === 'Ag' ? 'silver' : 'gold')}<div style="flex:1"><div class="t">${n}</div><div class="s num">Alış ${b}</div></div><div style="text-align:right"><div class="t num">${s}</div><div class="${up ? 'up' : 'down'} num" style="font-size:13px;font-weight:700;margin-top:2px">${p}</div></div></div>`,
      )
      .join('')}
  </div>`,
});

/* ---------- 3. Alarm ---------- */
const alarm = page({
  title: 'Hedefe gelince<br><em>altın alarmı</em> çalsın',
  sub: 'Fiyat alarmını kur; uygulama kapalıyken bile bildirim telefonuna düşer.',
  ui: `
  <div class="nav"><h2>Fiyat alarmı</h2><div class="chipbtn muted" style="font-size:18px">✕</div></div>
  <div class="card">
    <div class="row">${coin(44, '24')}<div style="flex:1"><div class="t">Gram Altın</div><div class="s num">Şu an ₺6.148,25</div></div><span class="pill gold gold">🔔 Kurulu</span></div>
  </div>
  <div class="card" style="margin-top:12px;text-align:center">
    <div class="cap">Hedef fiyat</div>
    <div class="num up" style="font-size:44px;font-weight:800;margin:10px 0 6px;letter-spacing:-1px">₺6.250,00</div>
    <div style="height:2px;background:#2E333B;margin:0 30px 14px"></div>
    <div class="row" style="gap:8px">${['Yükselince', 'Düşünce'].map((t, i) => `<div style="flex:1;padding:10px;border-radius:14px;font-weight:800;font-size:14px;${i === 0 ? 'border:1.5px solid #D4A64F;background:rgba(212,166,79,.16);color:#E2B866' : 'border:1.5px solid #2E333B;color:#7E8794'}">${t}</div>`).join('')}</div>
  </div>
  <div class="card" style="margin-top:12px;position:relative">
    <div class="row between"><span class="t">Son 24 saat</span><span class="gold" style="font-size:13px;font-weight:800">Hedefe %1,6</span></div>
    <div style="position:relative;margin-top:14px">
      <div style="position:absolute;left:0;right:0;top:14px;border-top:2px dashed #E2B866;opacity:.8"></div>
      <span style="position:absolute;right:0;top:-2px;font-size:11px;font-weight:800;color:#E2B866;background:#1C1F24;padding:0 4px">₺6.250</span>
      ${spark([30, 28, 33, 31, 36, 35, 39, 38, 43, 45, 44, 49, 52, 58], 326, 150, '#3FB97A')}
    </div>
  </div>
  <div style="margin-top:14px;padding:14px;border-radius:16px;background:#D4A64F;color:#1A1408;text-align:center;font-weight:800;font-size:16px">Alarmı kaydet</div>`,
  extra: `<div class="float" style="left:60px;right:60px;top:1010px;border-radius:56px;padding:34px 38px;background:rgba(40,44,52,.88);backdrop-filter:blur(30px);box-shadow:0 40px 120px rgba(0,0,0,.6);border:1.5px solid rgba(255,255,255,.12);display:flex;gap:28px;align-items:center">
    <div style="width:96px;height:96px;border-radius:24px;background:#14171D;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px solid rgba(242,195,92,.4)">${LOGO.replace('width="54" height="33"', 'width="66" height="40"')}</div>
    <div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:28px;color:#AEB6C2;font-weight:600"><span>ALTIN KASAM</span><span>şimdi</span></div>
    <div style="font-size:36px;font-weight:800;margin-top:6px">🔔 Gram altın hedefe ulaştı</div>
    <div style="font-size:32px;color:#C5CBD6;margin-top:4px">Fiyat ₺6.250,40 · hedefin ₺6.250</div></div></div>`,
});

/* ---------- 4. Ekonomik takvim ---------- */
const ev = (flag, title, time, impact, exp, prev, highlight = false) => `
  <div class="card" style="margin-top:10px;${highlight ? 'border-color:rgba(212,166,79,.6);background:linear-gradient(160deg,#2A2419,#1C1F24 70%)' : ''}">
    <div class="row"><span style="font-size:26px">${flag}</span><div style="flex:1"><div class="t">${title}</div><div class="s">${time}</div></div>
    <span class="pill ${impact === 'Yüksek' ? 'down' : 'gold'} ${impact === 'Yüksek' ? 'down' : 'gold'}">${impact} etki</span></div>
    <div class="row" style="gap:18px;margin-top:10px;font-size:13px"><span class="muted">Beklenti <b class="num" style="color:#F2EEE6">${exp}</b></span><span class="muted">Önceki <b class="num" style="color:#F2EEE6">${prev}</b></span></div>
  </div>`;
const calendar = page({
  title: 'Fed, TCMB, enflasyon:<br><em>ekonomik takvim</em>',
  sub: 'Altını oynatan kararları önceden gör, açıklamadan önce hatırlatma al.',
  tab: 'Analiz',
  ui: `
  <div class="nav"><h2>Takvim</h2><div class="chipbtn">🔔</div></div>
  <div class="card gold-card" style="text-align:center">
    <div class="cap">Sıradaki önemli veri</div>
    <div class="t" style="font-size:18px;margin-top:8px">🇺🇸 ABD Enflasyon (TÜFE)</div>
    <div class="num gold" style="font-size:40px;font-weight:800;letter-spacing:1px;margin-top:6px">02:14:37</div>
    <div class="s">Bugün 16:30 · hatırlatma kurulu</div>
  </div>
  <div class="cap" style="margin:18px 2px 0">Bugün</div>
  ${ev('🇺🇸', 'ABD Enflasyon (TÜFE)', '16:30 · Yıllık', 'Yüksek', '%2,9', '%3,0', true)}
  ${ev('🇹🇷', 'TCMB Faiz Kararı', '14:00 · Politika faizi', 'Yüksek', '%42,5', '%45,0')}
  <div class="cap" style="margin:18px 2px 0">Yarın</div>
  ${ev('🇺🇸', 'Fed Faiz Kararı', '21:00 · FOMC', 'Yüksek', '%4,25', '%4,50')}
  ${ev('🇺🇸', 'Tarım Dışı İstihdam', '15:30 · Aylık', 'Orta', '165B', '142B')}`,
});

/* ---------- 5. Haber ve analiz ---------- */
const news = (src, tag, title, effect, up) => `
  <div class="card" style="margin-top:10px;padding:0;overflow:hidden">
    <div style="height:120px;background:url('${src}') center/cover"></div>
    <div style="padding:12px 14px 14px">
      <div class="row between"><span class="cap">${tag}</span><span class="pill ${up ? 'up up' : 'down down'}">${up ? '▲ Altına olumlu' : '▼ Altına olumsuz'}</span></div>
      <div class="t" style="margin-top:6px;line-height:1.3">${title}</div>
      <div class="s" style="margin-top:4px">${effect}</div>
    </div>
  </div>`;
const analysis = page({
  title: 'Haberler ve haftalık<br><em>altın analizi</em>',
  sub: 'Her haberin altına etkisini ve haftalık yön beklentisini tek yerde gör.',
  tab: 'Analiz',
  ui: `
  <div class="nav"><h2>Analiz</h2><span class="pill gold gold">PRO</span></div>
  <div class="card gold-card">
    <div class="cap">Haftalık analiz · bu hafta</div>
    <div class="row between" style="margin-top:8px"><div class="t" style="font-size:20px">Yükseliş eğilimi</div><span class="pill up up">▲ Güçlü</span></div>
    <div style="margin-top:12px;height:12px;border-radius:6px;background:linear-gradient(90deg,#8E1B12,#E0796E 30%,#7E8794 50%,#6BBF8E 70%,#145234);position:relative">
      <div style="position:absolute;left:72%;top:-5px;width:22px;height:22px;border-radius:11px;background:#F2EEE6;border:4px solid #3FB97A;margin-left:-11px"></div></div>
    <div class="row between s" style="margin-top:8px"><span>Düşüş</span><span>Nötr</span><span>Yükseliş</span></div>
  </div>
  <div class="card" style="margin-top:10px">
    <div class="row between"><span class="t">Topluluk beklentisi</span><span class="up" style="font-weight:800;font-size:14px">%64 yükseliş</span></div>
    <div style="display:flex;height:10px;border-radius:6px;overflow:hidden;margin-top:10px"><div style="width:64%;background:#3FB97A"></div><div style="flex:1;background:#F06A5E"></div></div>
  </div>
  ${news(img('news-gold.png'), 'Altın · 12 dk önce', 'Merkez bankalarının altın alımı rekor seviyede', 'Güçlü talep fiyatları destekleyebilir.', true)}
  ${news(img('news-rate.png'), 'Faiz · 1 saat önce', 'Fed’den faiz indirimi sinyali geldi', 'Düşen faiz altını cazip kılar.', true)}`,
});

const SCREENS = [
  ['01-kasa', vault],
  ['02-canli-fiyat', prices],
  ['03-alarm', alarm],
  ['04-ekonomik-takvim', calendar],
  ['05-analiz', analysis],
];

/* ---------- Ürün sayfası başlık görseli (3840×1646) ---------- */
const HW = 3840;
const HH = 1646;
const [vaultUi, pricesUi, alarmUi] = UI_LIST;
const feature = (icon, label) =>
  `<div class="feat"><span class="fi">${icon}</span>${label}</div>`;
const header = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}
html, body { width: ${HW}px; height: ${HH}px; }
.bg { background:
  radial-gradient(1400px 1100px at 72% 50%, rgba(226,176,74,.24), transparent 70%),
  radial-gradient(900px 700px at 8% 0%, rgba(226,176,74,.10), transparent 70%),
  linear-gradient(120deg, #181C23 0%, #0E1115 70%); }
.rays { left: 2880px; top: 823px; width: 3600px; height: 3600px; margin-left: -1800px; margin-top: -1800px; }
.left { position: absolute; left: 210px; top: 0; bottom: 0; width: 1900px; display: flex; flex-direction: column; justify-content: center; z-index: 5; }
.brand2 { display: flex; align-items: center; gap: 34px; }
.brand2 .mark { width: 168px; height: 168px; border-radius: 40px; background: #14171D; border: 2px solid rgba(242,195,92,.45); display: flex; align-items: center; justify-content: center; box-shadow: 0 30px 80px rgba(0,0,0,.5); }
.brand2 .name { font-size: 84px; font-weight: 800; letter-spacing: -1px; }
.brand2 .tag { font-size: 38px; color: #AEB6C2; font-weight: 600; margin-top: 4px; }
.left h1 { margin-top: 80px; font-size: 118px; white-space: nowrap; line-height: 1.04; letter-spacing: -3.5px; }
.left .sub { margin: 44px 0 0; max-width: 1500px; font-size: 52px; text-align: left; }
.feats { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 70px; max-width: 1650px; }
.feat { display: flex; align-items: center; gap: 18px; padding: 22px 36px 22px 24px; border-radius: 999px; background: rgba(255,255,255,.06); border: 2px solid rgba(242,195,92,.32); font-size: 42px; font-weight: 700; }
.fi { width: 64px; height: 64px; border-radius: 32px; background: rgba(242,195,92,.18); display: flex; align-items: center; justify-content: center; font-size: 34px; }
.ph { position: absolute; top: 50%; width: 940px; height: 1900px; border-radius: 132px; background: #05070A; padding: 22px;
  box-shadow: 0 0 0 3px #3A3F48, 0 0 0 9px #1A1D22, 0 80px 180px rgba(0,0,0,.7); }
</style></head><body>
<div class="bg"></div><div class="rays"></div>
<div class="left">
  <div class="brand2"><div class="mark">${LOGO.replace('width="54" height="33"', 'width="118" height="72"')}</div>
    <div><div class="name">Altın Kasam</div><div class="tag">Altın takip ve birikim uygulaması</div></div></div>
  <h1>Gram altın, çeyrek ve gümüş<br><em>canlı fiyat, kasa ve alarm</em></h1>
  <p class="sub">Birikimini tek kasada takip et, hedef fiyata gelince haber al; ekonomik takvim ve haftalık altın analiziyle bir adım önde ol.</p>
  <div class="feats">
    ${feature('📈', 'Canlı altın fiyatları')}
    ${feature('🔐', 'Altın kasası ve kâr')}
    ${feature('🔔', 'Fiyat alarmı')}
    ${feature('📅', 'Ekonomik takvim')}
    ${feature('📰', 'Haftalık altın analizi')}
  </div>
</div>
<div class="ph" style="left:2080px;margin-top:-950px;transform:scale(.62) rotate(-9deg);opacity:.9;z-index:2">${phoneHtml(vaultUi.ui, vaultUi.tab)}</div>
<div class="ph" style="left:2900px;margin-top:-950px;transform:scale(.62) rotate(9deg);opacity:.9;z-index:2">${phoneHtml(alarmUi.ui, alarmUi.tab)}</div>
<div class="ph" style="left:2490px;margin-top:-910px;transform:scale(.74);z-index:4;box-shadow:0 0 0 3px #3A3F48, 0 0 0 9px #1A1D22, 0 90px 200px rgba(0,0,0,.75), 0 0 260px rgba(226,176,74,.25)">${phoneHtml(pricesUi.ui, pricesUi.tab)}</div>
<div class="float" style="left:2250px;top:140px;width:1120px;border-radius:56px;padding:32px 38px;background:rgba(40,44,52,.9);backdrop-filter:blur(30px);box-shadow:0 40px 120px rgba(0,0,0,.6);border:1.5px solid rgba(255,255,255,.12);display:flex;gap:28px;align-items:center;z-index:6">
  <div style="width:96px;height:96px;border-radius:24px;background:#14171D;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px solid rgba(242,195,92,.4)">${LOGO.replace('width="54" height="33"', 'width="66" height="40"')}</div>
  <div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:28px;color:#AEB6C2;font-weight:600"><span>ALTIN KASAM</span><span>şimdi</span></div>
  <div style="font-size:38px;font-weight:800;margin-top:6px">🔔 Gram altın hedefe ulaştı</div>
  <div style="font-size:32px;color:#C5CBD6;margin-top:4px">Fiyat ₺6.250,40 · hedefin ₺6.250</div></div></div>
<div class="float callout" style="left:2150px;top:1180px;transform:rotate(-4deg);z-index:6">
  <div style="font-size:32px;color:#AEB6C2;font-weight:600">Kasa değeri</div>
  <div class="num" style="font-size:80px;font-weight:800;letter-spacing:-1px">₺412.850</div>
  <div class="num" style="font-size:40px;font-weight:800;color:#3FB97A">▲ +%10,3 kâr</div></div>
<div class="float" style="left:3500px;top:1260px;z-index:6">${coin(170, '24')}</div>
<div class="float" style="left:3600px;top:1110px;z-index:5;opacity:.9">${coin(110, 'Ç')}</div>
</body></html>`;
SCREENS.push(['00-product-header', header, HW, HH]);

/* ---------- Arama sonucu / tanıtım görseli (3840×2560) ---------- */
const SW = 3840;
const SH = 2560;
const orbitCard = (style, inner) => `<div class="oc" style="${style}">${inner}</div>`;
const search = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}
html, body { width: ${SW}px; height: ${SH}px; }
.bg { background:
  radial-gradient(1500px 1300px at 50% 72%, rgba(226,176,74,.30), transparent 68%),
  radial-gradient(1200px 800px at 50% 0%, rgba(226,176,74,.10), transparent 70%),
  linear-gradient(180deg, #161A21 0%, #0B0D11 100%); }
.rays { left: 50%; top: 1720px; width: 4400px; height: 4400px; margin-left: -2200px; margin-top: -2200px; opacity: .7; }
.ring { position: absolute; left: 50%; top: 1720px; border-radius: 50%; border: 3px dashed rgba(242,195,92,.22); transform: translate(-50%, -50%); }
.top { position: absolute; top: 150px; left: 0; right: 0; text-align: center; z-index: 6; }
.top .brand { font-size: 52px; padding: 20px 46px 20px 30px; gap: 22px; }
.top h1 { margin-top: 60px; font-size: 200px; line-height: 1.0; letter-spacing: -6px; }
.top .sub { max-width: 3300px; font-size: 62px; margin-top: 46px; }
.ph { position: absolute; left: 50%; top: 1000px; width: 940px; height: 1900px; margin-left: -470px; border-radius: 132px; background: #05070A; padding: 22px; z-index: 4;
  transform: scale(.92); transform-origin: top center;
  box-shadow: 0 0 0 3px #3A3F48, 0 0 0 9px #1A1D22, 0 100px 220px rgba(0,0,0,.75), 0 0 320px rgba(226,176,74,.35); }
.oc { position: absolute; z-index: 7; width: 900px; padding: 46px 52px; border-radius: 60px; background: rgba(30,33,39,.92);
  border: 2.5px solid rgba(242,195,92,.45); box-shadow: 0 50px 130px rgba(0,0,0,.6); backdrop-filter: blur(24px); }
.oc .k { font-size: 38px; color: #AEB6C2; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; gap: 18px; }
.oc .k b { width: 76px; height: 76px; border-radius: 22px; background: rgba(242,195,92,.18); display: flex; align-items: center; justify-content: center; font-size: 42px; }
.oc .v { font-size: 96px; font-weight: 800; letter-spacing: -2px; margin-top: 18px; }
.oc .d { font-size: 42px; color: #C5CBD6; } .oc .d.up { color: #3FB97A; } .oc .d.x { margin-top: 8px; font-weight: 600; }
.cta { position: absolute; left: 50%; bottom: 110px; transform: translateX(-50%); z-index: 8; display: flex; align-items: center; gap: 30px;
  padding: 40px 80px; border-radius: 999px; background: linear-gradient(180deg, #F6D37A, #D9A441); color: #1A1408; font-size: 66px; font-weight: 900;
  box-shadow: 0 30px 90px rgba(226,176,74,.45), inset 0 3px 0 rgba(255,255,255,.5); white-space: nowrap; }
.fade { position: absolute; left: 0; right: 0; bottom: 0; height: 520px; background: linear-gradient(180deg, transparent, #0B0D11 75%); z-index: 5; }
</style></head><body>
<div class="bg"></div><div class="rays"></div>
<div class="ring" style="width:2300px;height:2300px"></div><div class="ring" style="width:3100px;height:3100px;opacity:.6"></div>
<div class="top">
  <div class="brand">${LOGO.replace('width="54" height="33"', 'width="84" height="51"')}Altın Kasam</div>
  <h1>Altının fiyatı <em>cebinde</em>,<br>birikimin <em>kasanda</em></h1>
  <p class="sub">Canlı gram altın ve çeyrek fiyatları, altın alarmı, ekonomik takvim ve haftalık altın analizi tek uygulamada.</p>
</div>
<div class="ph">${phoneHtml(pricesUi.ui, pricesUi.tab)}</div>
${orbitCard('left:300px;top:1180px;transform:rotate(-5deg)', `<div class="k"><b>🔐</b>Kasa değeri</div><div class="v num">₺412.850</div><div class="d up">▲ +₺38.420 · %10,3 kâr</div>`)}
${orbitCard('left:220px;top:1820px;transform:rotate(3deg)', `<div class="k"><b>📅</b>Ekonomik takvim</div><div class="v num gold">02:14:37</div><div class="d">🇺🇸 ABD enflasyonuna kalan süre</div>`)}
${orbitCard('right:300px;top:1180px;transform:rotate(5deg)', `<div class="k"><b>🔔</b>Altın alarmı</div><div class="v num up">₺6.250</div><div class="d">Gram altın hedefe ulaştı</div>`)}
${orbitCard('right:220px;top:1820px;transform:rotate(-3deg)', `<div class="k"><b>📰</b>Haftalık analiz</div><div class="v up">Yükseliş</div><div class="d">Topluluğun %64’ü yükseliş bekliyor</div>`)}
<div class="float" style="left:1150px;top:1060px;z-index:6">${coin(150, '24')}</div>
<div class="float" style="left:2560px;top:1000px;z-index:6;opacity:.95">${coin(120, 'Ç')}</div>
<div class="float" style="left:1260px;top:2120px;z-index:6;opacity:.9">${coin(100, 'Ag', 'silver')}</div>
<div class="float" style="left:2530px;top:2080px;z-index:6">${coin(170, 'C')}</div>
<div class="fade"></div>
<div class="cta">${LOGO.replace('width="54" height="33"', 'width="92" height="56"').replaceAll('#0F1216', '#E2B04A').replace('fill="#F6DD98" stroke="#F6DD98"', 'fill="#1A1408" stroke="#1A1408"').replace('fill="#E2B04A" stroke="#E2B04A"', 'fill="#3A2A0C" stroke="#3A2A0C"')}Ücretsiz indir, altını takip et</div>
</body></html>`;
SCREENS.push(['00-search-results', search, SW, SH]);

fs.mkdirSync(HTML_DIR, { recursive: true });
for (const [name, html, w = W, h = H] of SCREENS) {
  const file = path.join(HTML_DIR, `${name}.html`);
  fs.writeFileSync(file, html);
  const png = path.join(OUT, `${name}.png`);
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--allow-file-access-from-files',
    '--virtual-time-budget=2000',
    `--window-size=${w},${h}`,
    `--screenshot=${png}`,
    pathToFileURL(file).href,
  ], { stdio: 'ignore' });
  console.log('✓', path.relative(ROOT, png));
}
