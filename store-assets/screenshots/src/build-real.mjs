// Mağaza ekran görüntüleri (1206×2622): simülatörden alınan GERÇEK uygulama ekranları (src/raw/*.png).
// Her görselde telefon küçük tutulur; ekranın en önemli özelliğini anlatan, uygulamadaki verilerle birebir
// tutarlı ÖZEL TASARIM kartlar (canlı fiyat panosu, hedef halkası, alarm merdiveni, Fed geri sayımı…)
// telefonun dışına taşar. Başlık çevresinde rozet/çip yok.
// Çalıştırma: node store-assets/screenshots/src/build-real.mjs
// Ham ekranları yenilemek için: simülatörde (iPhone 17, 9:41 durum çubuğu) ilgili ekranı açıp
// `xcrun simctl io booted screenshot src/raw/<ad>.png` komutuyla kaydedin.
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
fs.mkdirSync(TMP, { recursive: true });

const raw = (n) => pathToFileURL(path.join(RAW, `${n}.png`)).href;

const LOGO = `<svg viewBox="236 352 552 332" width="60" height="36"><polygon points="292,442 732,442 680,360 344,360" fill="#F6DD98" stroke="#F6DD98" stroke-width="28" stroke-linejoin="round"/><polygon points="236,676 788,676 732,442 292,442" fill="#E2B04A" stroke="#E2B04A" stroke-width="28" stroke-linejoin="round"/><circle cx="512" cy="536" r="40" fill="#0F1216"/><polygon points="497,556 527,556 541,622 483,622" fill="#0F1216" stroke="#0F1216" stroke-width="10" stroke-linejoin="round"/></svg>`;


const GREEN = '#1E8A55', RED = '#C0392B', GOLD = '#B8893B', INK = '#14171C', MUTED = '#6A717C';
const card = (left, top, width, rot, html, cls = '') =>
  `<div class="fc ${cls}" style="left:${left}px;top:${top}px;width:${width}px;transform:rotate(${rot}deg)">${html}</div>`;

const tile = (name, value, up, unit = '') => `
  <div class="tile"><div class="tn">${name}</div>
  <div class="tv">${unit}${value}<span style="color:${up ? GREEN : RED}">${up ? '▲' : '▼'}</span></div></div>`;

const cards = {
  market: (() => {
    const bar = (fill1, fill2, stroke) => `<svg width="150" height="120" viewBox="0 0 150 120"><defs><linearGradient id="b${fill1.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill1}"/><stop offset="1" stop-color="${fill2}"/></linearGradient></defs>
      <polygon points="30,60 120,60 108,26 42,26" fill="${fill1}" opacity=".9"/><polygon points="14,104 136,104 120,60 30,60" fill="url(#b${fill1.slice(1)})" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="42,26 108,26 120,60 30,60" fill="none" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/></svg>`;
    const item = (n, v, up) => `<span class="ti"><b>${n}</b> ${v} <i style="color:${up ? '#3FB97A' : '#F06A5E'}">${up ? '▲' : '▼'}</i></span>`;
    const ticker = card(40, 830, 1126, 1.5, `
      <div class="band">
        <div class="trk">${[['USD', '50,42', 1], ['EUR', '55,28', 0], ['GRAM', '6.270,46', 1], ['22 AYAR', '5.736,28', 1], ['14 AYAR', '3.441,25', 1], ['ÇEYREK', '10.266', 1]].map(([n, v, u]) => item(n, v, u)).join('')}</div>
        <div class="fade l"></div><div class="fade r"></div>
        <div class="hint">› › ›</div>
      </div>`, 'band-wrap');
    const prices = card(58, 1190, 1090, -1.2, `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:26px">
        <div style="display:flex;align-items:center;gap:18px"><i class="pulse"></i><b style="font-size:40px;letter-spacing:1px">CANLI FİYAT</b></div>
        <span style="font-size:32px;color:${MUTED};font-weight:600">10 sn'de bir güncellenir</span></div>
      <div class="prow" style="background:linear-gradient(90deg,#FBF1D3,#FFFCF4)">
        ${bar('#F6DD98', '#C8922E', '#9A6B12')}
        <div style="flex:1"><div style="font-size:38px;font-weight:700;color:#8A6416">Gram Altın <span style="font-weight:500;color:${MUTED}">· 24 ayar</span></div>
          <div style="font-size:96px;font-weight:850;line-height:1.05">₺6.274,27</div></div>
        <b style="font-size:70px;color:${GREEN}">▲</b></div>
      <div class="prow" style="background:linear-gradient(90deg,#ECEFF3,#FFFCF4);margin-top:22px">
        ${bar('#F1F3F6', '#9AA3AF', '#6E7784')}
        <div style="flex:1"><div style="font-size:38px;font-weight:700;color:#5B6270">Gram Gümüş</div>
          <div style="font-size:96px;font-weight:850;line-height:1.05">₺73,70</div></div>
        <b style="font-size:70px;color:${RED}">▼</b></div>`);
    return ticker + prices;
  })(),

  goal: card(58, 900, 1090, 1.2, `
    <div style="display:flex;align-items:center;gap:44px">
      <svg width="250" height="250" viewBox="0 0 180 180"><circle cx="90" cy="90" r="70" fill="none" stroke="#EADFC8" stroke-width="22"/>
        <circle cx="90" cy="90" r="70" fill="none" stroke="url(#gg)" stroke-width="22" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 70 * 0.55} 999" transform="rotate(-90 90 90)"/>
        <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0C25C"/><stop offset="1" stop-color="#B8893B"/></linearGradient></defs>
        <text x="90" y="104" text-anchor="middle" font-size="46" font-weight="850" fill="${INK}">%55</text></svg>
      <div><div style="font-size:34px;font-weight:700;color:${GOLD};letter-spacing:.8px">KASIM HEDEFİ</div>
        <div style="font-size:68px;font-weight:850;margin-top:6px;line-height:1.05">16,51 g <span style="font-size:44px;color:${MUTED};font-weight:600">/ 30 g</span></div>
        <div style="font-size:38px;color:#3B4150;margin-top:14px;line-height:1.3">Hedefe <b>günde ≈0,96 g</b> kaldı<br>14 gün kaldı</div></div>
    </div>`),

  profit: card(58, 1360, 1090, -1.2, `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><div style="font-size:34px;font-weight:700;color:${MUTED};letter-spacing:.8px">TOPLAM KÂR</div>
        <div style="font-size:104px;font-weight:850;color:${GREEN};line-height:1.05;margin-top:4px">+₺113.497</div>
        <div style="font-size:40px;font-weight:700;color:${GREEN}">+%27,1 maliyete göre</div></div>
      <div style="text-align:right;font-size:34px;color:${MUTED};line-height:1.5;padding-top:6px">Toplam varlık<br><b style="color:${INK};font-size:44px">₺532.257</b><br>Maliyet <b style="color:${INK}">₺418.760</b></div></div>
    <svg viewBox="0 0 400 90" width="100%" height="190" preserveAspectRatio="none" style="margin-top:18px">
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GREEN}" stop-opacity=".35"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></linearGradient></defs>
      <path d="M0,86 L40,84 L80,80 L82,52 L130,50 L170,44 L210,34 L260,38 L300,30 L350,27 L400,22 L400,90 L0,90Z" fill="url(#pg)"/>
      <path d="M0,86 L40,84 L80,80 L82,52 L130,50 L170,44 L210,34 L260,38 L300,30 L350,27 L400,22" fill="none" stroke="${GREEN}" stroke-width="3.2" stroke-linejoin="round"/></svg>`),

  alarm: card(58, 1470, 1090, -1.2, `
    <div style="display:flex;align-items:center;gap:26px">
      <div style="width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#F0C25C,#B8893B);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>
      <div><div style="font-size:50px;font-weight:800;line-height:1.1">Gram Altın</div>
        <div style="font-size:36px;color:${MUTED};font-weight:600">yükselince haber ver</div></div></div>
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:34px">
      <div style="font-size:150px;font-weight:850;color:${GREEN};line-height:1;letter-spacing:-3px">₺6.500</div>
      <div style="font-size:60px;font-weight:850;color:${GREEN}">+%3,7</div></div>
    <div style="position:relative;margin:48px 6px 18px;height:14px;border-radius:7px;background:linear-gradient(90deg,#F0C25C,#2FAE6E)">
      <i style="position:absolute;left:-6px;top:-15px;width:44px;height:44px;border-radius:50%;background:${GOLD};border:8px solid #fff;box-shadow:0 8px 22px rgba(0,0,0,.3)"></i>
      <i style="position:absolute;right:-6px;top:-15px;width:44px;height:44px;border-radius:50%;background:${GREEN};border:8px solid #fff;box-shadow:0 8px 22px rgba(0,0,0,.3)"></i></div>
    <div style="display:flex;justify-content:space-between;font-size:38px;font-weight:700;color:#3B4150;margin-top:30px"><span>Şimdi ₺6.269</span><span style="color:${GREEN}">Hedef ₺6.500</span></div>`),

  fed: card(58, 920, 1090, 1.2, `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><div style="font-size:34px;font-weight:700;color:${GOLD};letter-spacing:.8px">🇺🇸 SIRADAKİ BÜYÜK OLAY</div>
        <div style="font-size:78px;font-weight:850;margin-top:8px;line-height:1.05">Fed faiz kararı</div>
        <div style="font-size:38px;color:${MUTED};margin-top:8px;font-weight:600">9 Aralık Çarşamba · 22:00</div></div>
      <div style="text-align:center;background:#14171C;border-radius:36px;padding:22px 36px;color:#F6DD98"><div style="font-size:92px;font-weight:850;line-height:1">22</div><div style="font-size:30px;font-weight:700;letter-spacing:1px">GÜN KALDI</div></div></div>
    <div style="margin-top:26px;padding:24px 30px;border-radius:30px;background:#EAF6EE;font-size:38px;line-height:1.3;color:#1B5E3D;font-weight:600">▲ Faiz indirimi ya da güvercin mesaj, altını destekler</div>`),

  timeline: card(58, 1400, 1090, -1.2, `
    <div style="font-size:34px;font-weight:700;color:${MUTED};letter-spacing:.8px;margin-bottom:34px">YAKLAŞAN AÇIKLAMALAR</div>
    <div style="position:relative;display:flex;justify-content:space-between;text-align:center">
      <div style="position:absolute;left:60px;right:60px;top:23px;height:6px;background:#EADFC8"></div>
      ${[['3 Ara', '🇹🇷', 'TÜFE', 0], ['4 Ara', '🇺🇸', 'İstihdam', 0], ['9 Ara', '🇺🇸', 'Fed', 1], ['10 Ara', '🇹🇷', 'TCMB', 1]].map(([d, f, n, hot]) => `
        <div style="position:relative;width:230px"><i style="display:block;margin:0 auto;width:52px;height:52px;border-radius:50%;background:${hot ? GOLD : '#fff'};border:7px solid ${hot ? '#F0C25C' : '#D8CDB4'}"></i>
        <div style="font-size:36px;font-weight:${hot ? 850 : 650};margin-top:16px;color:${hot ? INK : MUTED}">${d}</div>
        <div style="font-size:34px;margin-top:4px;font-weight:${hot ? 800 : 500};color:${hot ? GOLD : MUTED}">${f} ${n}</div></div>`).join('')}
    </div>`),

  outlook: card(58, 880, 1090, -1.2, `
    <div style="font-size:34px;font-weight:700;color:${GOLD};letter-spacing:.8px">16–22 KASIM · HAFTALIK GÖRÜNÜM</div>
    <div style="display:flex;gap:26px;margin-top:22px">
      <div style="flex:1;border-radius:34px;background:#EAF6EE;padding:26px 30px"><div style="font-size:34px;color:#3B4150;font-weight:600">Altın</div>
        <div style="font-size:60px;font-weight:850;color:${GREEN};margin-top:4px">▲ Yükseliş</div></div>
      <div style="flex:1;border-radius:34px;background:#F1EEE8;padding:26px 30px"><div style="font-size:34px;color:#3B4150;font-weight:600">Gümüş</div>
        <div style="font-size:60px;font-weight:850;color:#5B6270;margin-top:4px">▶ Yatay</div></div></div>`),

  levels: (() => {
    const W = 986, MIN = 3720, MAX = 3980;
    const x = (v) => Math.round((v - MIN) * (W / (MAX - MIN)));
    const lab = (v, big, color, cap, align = 'center') => `<div style="position:absolute;top:150px;left:${x(v)}px;transform:translateX(-50%);text-align:${align};white-space:nowrap">
      <i style="display:block;width:4px;height:26px;background:${color};margin:0 auto 12px;border-radius:2px"></i>
      <div style="font-size:48px;font-weight:850;color:${color};line-height:1">${big}</div>
      <div style="font-size:32px;color:#3B4150;font-weight:700;margin-top:8px">${cap}</div></div>`;
    return card(58, 1260, 1090, 1.2, `
      <div style="font-size:36px;font-weight:700;color:${MUTED};letter-spacing:.8px">ONS ALTIN · BU HAFTA</div>
      <div style="position:relative;height:330px;margin-top:20px">
        <div style="position:absolute;left:${x(3860)}px;top:0;transform:translateX(-50%);background:#14171C;color:#F6DD98;border-radius:30px;padding:14px 30px;text-align:center;white-space:nowrap">
          <span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:1px">ŞU AN </span><b style="font-size:54px">3.860 $</b></div>
        <div style="position:absolute;left:0;right:0;top:112px;height:36px;border-radius:18px;overflow:hidden;
          background:linear-gradient(90deg,#F2C7C0 0 ${x(3750)}px,#EADFC8 ${x(3750)}px ${x(3850)}px,#E8B84F ${x(3850)}px ${x(3900)}px,#EADFC8 ${x(3900)}px ${x(3950)}px,#7FD0A0 ${x(3950)}px 100%)"></div>
        <i style="position:absolute;left:${x(3860)}px;top:98px;width:64px;height:64px;margin-left:-32px;border-radius:50%;background:#14171C;border:10px solid #F6DD98;box-shadow:0 10px 26px rgba(0,0,0,.4)"></i>
        <div style="position:absolute;left:${x(3860)}px;top:56px;width:4px;height:44px;margin-left:-2px;background:#14171C"></div>
        ${lab(3750, '3.750 $', RED, 'Destek')}${lab(3875, '3.850–3.900 $', '#9A6B12', 'Direnç')}${lab(3950, '3.950 $', GREEN, 'Alım eşiği')}
      </div>
      <div style="margin-top:6px;padding:22px 30px;border-radius:28px;background:#EAF6EE;color:#1B5E3D;font-size:36px;font-weight:700;line-height:1.3">3.950 $ üstünde kalıcı kapanış, alım sinyali</div>`);
  })(),

  cpi: card(58, 900, 1090, -1.2, `
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div><div style="font-size:34px;font-weight:700;color:${GOLD};letter-spacing:.8px">🇺🇸 ABD ENFLASYONU (TÜFE)</div>
        <div style="display:flex;align-items:baseline;gap:22px;margin-top:10px"><span style="font-size:56px;color:${MUTED};font-weight:600;text-decoration:line-through">%0,6</span><span style="font-size:36px">→</span><span style="font-size:110px;font-weight:850;line-height:1">%0,4</span></div></div>
      <div style="text-align:center;border-radius:30px;background:#EAF6EE;color:#1B5E3D;padding:20px 28px;font-size:36px;font-weight:800;line-height:1.2">Enflasyon<br>yavaşladı</div></div>
    <div style="margin-top:22px;font-size:38px;color:#3B4150;line-height:1.3">Faiz indirimi beklentisini güçlendirir.</div>`),

  reaction: card(58, 1350, 1090, 1.2, `
    <div style="font-size:34px;font-weight:700;color:${MUTED};letter-spacing:.8px;margin-bottom:26px">AÇIKLAMADAN SONRAKİ 24 SAAT</div>
    <div style="display:flex;align-items:center;gap:24px;margin-bottom:26px"><b style="width:190px;font-size:44px">Altın</b>
      <div style="flex:1"><div style="width:61%;height:64px;border-radius:32px;background:linear-gradient(90deg,#E58A7E,${RED})"></div></div>
      <b style="width:280px;white-space:nowrap;text-align:right;font-size:52px;color:${RED}">▼ −%0,97</b></div>
    <div style="display:flex;align-items:center;gap:24px"><b style="width:190px;font-size:44px">Gümüş</b>
      <div style="flex:1"><div style="width:78%;height:64px;border-radius:32px;background:linear-gradient(90deg,${GREEN},#5BC48A)"></div></div>
      <b style="width:280px;white-space:nowrap;text-align:right;font-size:52px;color:${GREEN}">▲ +%1,24</b></div>`),
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;background:#0E1115;color:#F5F0E6;position:relative;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:
 radial-gradient(1000px 800px at 50% 55%,rgba(226,176,74,.32),transparent 70%),
 radial-gradient(700px 600px at 90% 98%,rgba(226,176,74,.14),transparent 70%),
 linear-gradient(180deg,#171B22 0%,#0E1115 62%)}
.rays{position:absolute;left:50%;top:1500px;width:2800px;height:2800px;margin:-1400px 0 0 -1400px;opacity:.45;
 background:repeating-conic-gradient(from 0deg,rgba(242,195,92,.11) 0deg 3.5deg,transparent 3.5deg 24deg);
 -webkit-mask:radial-gradient(circle,#000 0%,transparent 60%)}
.head{position:absolute;top:130px;left:0;right:0;text-align:center;padding:0 70px;z-index:6}
h1{font-size:118px;line-height:1.04;font-weight:850;letter-spacing:-3px}
h1 em{font-style:normal;background:linear-gradient(180deg,#FFEFB5,#E8B84F 55%,#C8922E);-webkit-background-clip:text;color:transparent}
.sub{margin:30px auto 0;max-width:1000px;font-size:46px;line-height:1.28;color:#B9C0CC;font-weight:500}
.phone{position:absolute;left:50%;width:900px;margin-left:-450px;z-index:3;border-radius:128px;background:#05070A;padding:20px;
 box-shadow:0 0 0 3px #4A505A,0 0 0 10px #1B1E24,0 70px 170px rgba(0,0,0,.7),0 0 240px rgba(226,176,74,.25)}
.phone img{display:block;width:100%;border-radius:110px}
.callout{position:absolute;z-index:8;border-radius:46px;border:4px solid rgba(232,184,79,.85);background-repeat:no-repeat;
 box-shadow:0 40px 100px rgba(0,0,0,.65),0 0 0 14px rgba(232,184,79,.12),0 0 120px rgba(226,176,74,.35)}
.fc{position:absolute;z-index:8;background:#FFFCF4;color:#14171C;border-radius:56px;padding:44px 52px;border:4px solid rgba(232,184,79,.9);
 box-shadow:0 40px 100px rgba(0,0,0,.65),0 0 0 14px rgba(232,184,79,.12),0 0 120px rgba(226,176,74,.35)}
.band-wrap{padding:0!important;background:#12161D!important;border-color:rgba(232,184,79,.95)!important}
.band{position:relative;overflow:hidden;border-radius:52px;height:130px;display:flex;align-items:center}
.trk{display:flex;gap:46px;white-space:nowrap;margin-left:-60px;font-size:44px;color:#E2B866;font-weight:800;letter-spacing:.5px}
.trk .ti b{color:#E2B04A;font-weight:850}.trk .ti{color:#F5F0E6}.trk .ti i{font-style:normal;font-size:34px}
.fade{position:absolute;top:0;bottom:0;width:150px}.fade.l{left:0;background:linear-gradient(90deg,#12161D,transparent)}
.fade.r{right:0;width:230px;background:linear-gradient(270deg,#12161D 20%,transparent)}
.hint{position:absolute;right:34px;top:50%;margin-top:-34px;font-size:56px;font-weight:850;color:#E2B04A;letter-spacing:-6px}
.prow{display:flex;align-items:center;gap:30px;padding:24px 34px;border-radius:38px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 28px;margin-top:30px}
.tile{padding:20px 28px;border-radius:30px;background:#F4EEDF}
.tn{font-size:30px;color:#6A717C;font-weight:600}
.tv{font-size:58px;font-weight:850;margin-top:4px;display:flex;justify-content:space-between;align-items:baseline}
.tv span{font-size:34px}
.pulse{display:block;width:26px;height:26px;border-radius:50%;background:#2FAE6E;box-shadow:0 0 0 10px rgba(47,174,110,.25),0 0 0 22px rgba(47,174,110,.12)}
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
    extra: cards.market,
  },
  {
    file: '02-altin-portfoyu-kasa',
    raw: 'kasa',
    title: '<em>Altın Portföyün</em> Cebinde',
    sub: 'Gram, çeyrek ve gümüş birikimin; kâr, zarar ve hedefinle tek yerde',
    phoneTop: 700,
    extra: cards.goal + cards.profit,
  },
  {
    file: '03-altin-fiyat-alarmi',
    raw: 'alarm',
    title: 'Hedef Fiyatta <em>Alarm</em> Çalsın',
    sub: 'Altın ya da gümüş istediğin fiyata gelince anında haber al',
    phoneTop: 820,
    extra: `<div class="float" style="left:56px;right:56px;top:600px;padding:30px 36px;display:flex;align-items:center;gap:26px">
        <div style="width:96px;height:96px;border-radius:26px;background:#14171C;display:flex;align-items:center;justify-content:center;flex-shrink:0">${LOGO}</div>
        <div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:30px;color:#6A717C;font-weight:600"><span>ALTIN KASAM</span><span>şimdi</span></div>
        <div style="font-size:40px;font-weight:800;margin-top:6px">Gram Altın ₺6.500,00 oldu</div>
        <div style="font-size:32px;color:#4A5160;margin-top:2px">Satış hedefine ulaştı</div></div>
      </div>` + cards.alarm,
  },
  {
    file: '04-fed-tcmb-ekonomik-takvim',
    raw: 'takvim',
    title: '<em>Fed ve TCMB</em> Kararını Kaçırma',
    sub: 'Faiz, enflasyon ve istihdam takvimi, altına etkisiyle birlikte',
    phoneTop: 700,
    extra: cards.fed + cards.timeline,
  },
  {
    file: '05-haftalik-altin-analizi',
    raw: 'analiz',
    title: 'Haftalık <em>Altın Analizi</em>',
    sub: 'Piyasanın yönünü, destek ve direnç seviyelerini her hafta oku',
    phoneTop: 700,
    extra: cards.outlook + cards.levels,
  },
  {
    file: '06-altin-ve-gumus-etkisi',
    raw: 'rapor',
    title: 'Veri Altını <em>Nasıl Etkiledi?</em>',
    sub: 'Her açıklamadan sonra altın ve gümüşün tepkisini gör',
    phoneTop: 700,
    extra: cards.cpi + cards.reaction,
  },
];

for (const s of shots) {
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>${CSS}
.phone{top:${s.phoneTop}px}${s.headTop ? `.head{top:${s.headTop}px}` : ''}</style></head><body>
<div class="bg"></div><div class="rays"></div>
<div class="head"><h1>${s.title}</h1><p class="sub">${s.sub}</p></div>
<div class="phone"><img src="${raw(s.raw)}"></div>
${s.extra}
</body></html>`;
  const htmlPath = path.join(TMP, `${s.file}.html`);
  fs.writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${W},${H}`, '--virtual-time-budget=4000',
    `--screenshot=${path.join(OUT, s.file + '.png')}`, pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore' });
  console.log('✓', s.file);
}
fs.rmSync(TMP, { recursive: true, force: true });
