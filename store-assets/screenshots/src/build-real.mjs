// Mağaza ekran görüntüleri (1206×2622): simülatörden alınan GERÇEK uygulama ekranları (src/raw/*.png).
// Telefon ortada ve uygulama görünür kalır; ekranın en önemli bölümleri ham ekrandan kırpılıp büyütülerek
// telefonun dışına taşan, altın çerçeveli "öne çıkan" kartlar olarak yerinden kaldırılır. Kenarlardan
// taşan küçük koyu bilgi kartları özelliği destekler. Başlık çevresinde rozet/çip yok.
// Çalıştırma: node store-assets/screenshots/src/build-real.mjs
// Ham ekranları yenilemek için: simülatörde (iPhone 17, 9:41 durum çubuğu) ilgili ekranı açıp
// `xcrun simctl io booted screenshot src/raw/<ad>.png` komutuyla kaydedin. Kırpma koordinatları
// (pop çağrılarındaki x/y/w/h) ham görüntünün 1206×2622 piksel uzayındadır.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..');
const RAW = path.join(HERE, 'raw');
const TMP = path.join(HERE, '.tmp');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1206;
const H = 2622;
const RAW_W = 1206;
const PHONE_W = 900;
const PHONE_PAD = 20;
const SCREEN_X = (W - PHONE_W) / 2 + PHONE_PAD; // telefon ekranının sol kenarı
const S = (PHONE_W - PHONE_PAD * 2) / RAW_W; // ham → telefon içi ölçek
fs.mkdirSync(TMP, { recursive: true });

const raw = (n) => pathToFileURL(path.join(RAW, `${n}.png`)).href;

const LOGO = `<svg viewBox="236 352 552 332" width="60" height="36"><polygon points="292,442 732,442 680,360 344,360" fill="#F6DD98" stroke="#F6DD98" stroke-width="28" stroke-linejoin="round"/><polygon points="236,676 788,676 732,442 292,442" fill="#E2B04A" stroke="#E2B04A" stroke-width="28" stroke-linejoin="round"/><circle cx="512" cy="536" r="40" fill="#0F1216"/><polygon points="497,556 527,556 541,622 483,622" fill="#0F1216" stroke="#0F1216" stroke-width="10" stroke-linejoin="round"/></svg>`;

const GREEN = '#3FB97A', RED = '#F06A5E', GOLD = '#E2B04A';

// Ham ekranın (x,y,w,h) bölgesini z kat büyütüp, telefondaki yerinin üstüne (dx,dy kaydırmasıyla) kaldırır.
const pop = (shot, phoneTop, { x, y, w, h, z = 1, rot = 0, dx = 0, dy = 0 }) => {
  const cw = w * z, ch = h * z;
  const cx = SCREEN_X + (x + w / 2) * S + dx;
  const cy = phoneTop + PHONE_PAD + (y + h / 2) * S + dy;
  return `<div class="pop" style="left:${cx - cw / 2}px;top:${cy - ch / 2}px;width:${cw}px;height:${ch}px;transform:rotate(${rot}deg);
    background-image:url(${raw(shot)});background-size:${RAW_W * z}px auto;background-position:${-x * z}px ${-y * z}px"></div>`;
};

// Kenardan taşan koyu bilgi kartı (SpookyAI "Fresh drops" kartı gibi).
const side = (pos, rot, html) => `<div class="side" style="${pos};transform:rotate(${rot}deg)">${html}</div>`;
const tag = (text, bg = GOLD, fg = '#14171C') => `<span class="tag" style="background:${bg};color:${fg}">${text}</span>`;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;background:#0E1115;color:#F5F0E6;position:relative;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:
 radial-gradient(1000px 800px at 50% 55%,rgba(226,176,74,.30),transparent 70%),
 radial-gradient(800px 700px at 0% 0%,rgba(200,146,46,.22),transparent 70%),
 radial-gradient(700px 600px at 100% 98%,rgba(226,176,74,.16),transparent 70%),
 linear-gradient(180deg,#171B22 0%,#0E1115 62%)}
.rays{position:absolute;left:50%;top:1500px;width:2800px;height:2800px;margin:-1400px 0 0 -1400px;opacity:.45;
 background:repeating-conic-gradient(from 0deg,rgba(242,195,92,.11) 0deg 3.5deg,transparent 3.5deg 24deg);
 -webkit-mask:radial-gradient(circle,#000 0%,transparent 60%)}
.head{position:absolute;top:130px;left:0;right:0;text-align:center;padding:0 70px;z-index:6}
h1{font-size:118px;line-height:1.04;font-weight:850;letter-spacing:-3px}
h1 em{font-style:normal;background:linear-gradient(180deg,#FFEFB5,#E8B84F 55%,#C8922E);-webkit-background-clip:text;color:transparent}
.sub{margin:30px auto 0;max-width:1000px;font-size:46px;line-height:1.28;color:#B9C0CC;font-weight:500}
.phone{position:absolute;left:50%;width:${PHONE_W}px;margin-left:-${PHONE_W / 2}px;z-index:3;border-radius:128px;background:#05070A;padding:${PHONE_PAD}px;
 box-shadow:0 0 0 3px #4A505A,0 0 0 10px #1B1E24,0 70px 170px rgba(0,0,0,.7),0 0 240px rgba(226,176,74,.25)}
.phone img{display:block;width:100%;border-radius:110px}
.pop{position:absolute;z-index:8;border-radius:44px;border:5px solid #E8B84F;background-repeat:no-repeat;background-color:#F1EFE9;
 box-shadow:0 46px 110px rgba(0,0,0,.7),0 0 0 12px rgba(232,184,79,.16),0 0 140px rgba(226,176,74,.5)}
.side{position:absolute;z-index:9;display:flex;align-items:center;gap:26px;padding:30px 40px;border-radius:44px;
 background:linear-gradient(160deg,#20252E,#12161D);border:3px solid rgba(232,184,79,.75);color:#F5F0E6;
 box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 60px rgba(226,176,74,.22)}
.side b{display:block;font-size:46px;font-weight:850;line-height:1.1}
.side small{display:block;font-size:32px;color:#AEB5C1;font-weight:600;margin-top:4px}
.tag{display:inline-block;padding:10px 24px;border-radius:999px;font-size:30px;font-weight:850;letter-spacing:1px;white-space:nowrap}
.pulse{display:block;flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#2FAE6E;box-shadow:0 0 0 10px rgba(47,174,110,.25),0 0 0 22px rgba(47,174,110,.12)}
.big{font-size:84px!important;color:#F6DD98;letter-spacing:-1px}
.float{position:absolute;z-index:9;border-radius:56px;background:rgba(255,252,244,.97);color:#14171C;box-shadow:0 30px 80px rgba(0,0,0,.55);border:3px solid rgba(226,176,74,.7)}
`;

const shots = [
  {
    file: '01-canli-altin-fiyatlari',
    raw: 'market',
    title: 'Canlı <em>Altın Fiyatları</em>',
    sub: 'Gram altın ve gümüş fiyatları saniyeler içinde güncel',
    phoneTop: 660,
    headTop: 210,
    extra: (pt) =>
      pop('market', pt, { x: 0, y: 302, w: 1206, h: 100, z: 1.0, rot: -2, dy: -10 }) +
      pop('market', pt, { x: 24, y: 760, w: 1158, h: 880, z: 0.86, rot: 1.5, dy: 20 }) +
      side('right:28px;top:2030px', -3, `<i class="pulse"></i><div><b>Canlı fiyat</b><small>10 sn'de bir güncellenir</small></div>`) +
      side('left:28px;top:2280px', 2.5, `<div><b>Gram Gümüş</b><small>₺73,70 <span style="color:${RED}">▼</span> · Platin · Brent</small></div>`),
  },
  {
    file: '02-altin-portfoyu-kasa',
    raw: 'kasa',
    title: '<em>Altın Portföyün</em> Cebinde',
    sub: 'Gram, çeyrek ve gümüş birikimin; kâr, zarar ve hedefinle tek yerde',
    phoneTop: 700,
    extra: (pt) =>
      pop('kasa', pt, { x: 60, y: 338, w: 1086, h: 250, z: 1.05, rot: -1.5, dy: -10 }) +
      pop('kasa', pt, { x: 40, y: 1940, w: 1126, h: 400, z: 1.0, rot: 1.5 }) +
      side('left:28px;top:1270px', 3, `<div><b class="big">81,36 g</b><small>altın karşılığı · 24 ayar</small></div>`) +
      side('right:28px;top:1600px', -3, `${tag('BUGÜN', '#2FAE6E', '#fff')}<div><b style="color:${GREEN}">+₺2.651</b><small>düne göre kâr</small></div>`),
  },
  {
    file: '03-altin-fiyat-alarmi',
    raw: 'alarm',
    title: 'Hedef Fiyatta <em>Alarm</em> Çalsın',
    sub: 'Altın ya da gümüş istediğin fiyata gelince anında haber al',
    phoneTop: 820,
    extra: (pt) =>
      `<div class="float" style="left:56px;right:56px;top:600px;padding:30px 36px;display:flex;align-items:center;gap:26px">
        <div style="width:96px;height:96px;border-radius:26px;background:#14171C;display:flex;align-items:center;justify-content:center;flex-shrink:0">${LOGO}</div>
        <div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:30px;color:#6A717C;font-weight:600"><span>ALTIN KASAM</span><span>şimdi</span></div>
        <div style="font-size:40px;font-weight:800;margin-top:6px">Gram Altın ₺6.500,00 oldu</div>
        <div style="font-size:32px;color:#4A5160;margin-top:2px">Satış hedefine ulaştı</div></div>
      </div>` +
      pop('alarm', pt, { x: 30, y: 950, w: 1146, h: 480, z: 0.96, rot: -1.5 }) +
      pop('alarm', pt, { x: 40, y: 2130, w: 1126, h: 220, z: 1.0, rot: 1.5, dy: -20 }) +
      side('left:28px;top:2040px', 3, `${tag('▲ +%3', '#2FAE6E', '#fff')}<div><b>Yüzdeyle kur</b><small>ya da hedef fiyat yaz</small></div>`),
  },
  {
    file: '04-fed-tcmb-ekonomik-takvim',
    raw: 'takvim',
    title: '<em>Fed ve TCMB</em> Kararını Kaçırma',
    sub: 'Faiz, enflasyon ve istihdam takvimi, altına etkisiyle birlikte',
    phoneTop: 700,
    extra: (pt) =>
      pop('takvim', pt, { x: 60, y: 580, w: 1086, h: 430, z: 1.05, rot: -1.5, dy: -60 }) +
      pop('takvim', pt, { x: 60, y: 1110, w: 1086, h: 700, z: 0.98, rot: 1.5, dy: 80 }) +
      side('right:28px;top:2290px', -3, `<div style="text-align:center"><b class="big" style="font-size:96px!important">22</b><small style="margin-top:0">GÜN KALDI</small></div><div><b>Fed faiz kararı</b><small>9 Aralık · 22:00</small></div>`),
  },
  {
    file: '05-haftalik-altin-analizi',
    raw: 'analiz',
    title: 'Haftalık <em>Altın Analizi</em>',
    sub: 'Piyasanın yönünü, destek ve direnç seviyelerini her hafta oku',
    phoneTop: 700,
    extra: (pt) =>
      pop('analiz', pt, { x: 60, y: 615, w: 1086, h: 315, z: 1.0, rot: -1.5, dy: -20 }) +
      pop('analiz', pt, { x: 60, y: 1660, w: 1086, h: 600, z: 1.04, rot: 1.5, dy: 10 }) +
      side('left:28px;top:1390px', 3, `${tag('ONS', '#F6DD98')}<div><b>Destek 3.750 $</b><small>direnç 3.850–3.900 $</small></div>`),
  },
  {
    file: '06-altin-ve-gumus-etkisi',
    raw: 'rapor',
    title: 'Veri Altını <em>Nasıl Etkiledi?</em>',
    sub: 'Her açıklamadan sonra altın ve gümüşün tepkisini gör',
    phoneTop: 700,
    extra: (pt) =>
      pop('rapor', pt, { x: 60, y: 385, w: 1086, h: 320, z: 1.05, rot: -1.5, dy: -10 }) +
      pop('rapor', pt, { x: 30, y: 1450, w: 1146, h: 400, z: 1.02, rot: 1.5 }) +
      side('right:28px;top:2210px', -3, `${tag('24 SAAT')}<div><b>Piyasa tepkisi</b><small>açıklamadan sonra</small></div>`),
  },
];

for (const s of shots) {
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}
.phone{top:${s.phoneTop}px}${s.headTop ? `.head{top:${s.headTop}px}` : ''}</style></head><body>
<div class="bg"></div><div class="rays"></div>
<div class="head"><h1>${s.title}</h1><p class="sub">${s.sub}</p></div>
<div class="phone"><img src="${raw(s.raw)}"></div>
${s.extra(s.phoneTop)}
</body></html>`;
  const htmlPath = path.join(TMP, `${s.file}.html`);
  fs.writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${W},${H}`, '--virtual-time-budget=4000', '--allow-file-access-from-files',
    `--screenshot=${path.join(OUT, s.file + '.png')}`, pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore' });
  console.log('✓', s.file);
}
fs.rmSync(TMP, { recursive: true, force: true });
