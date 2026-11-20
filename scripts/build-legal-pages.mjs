#!/usr/bin/env node
/**
 * docs/legal ve PRIVACY.md'den landing sitesine statik sayfa üretir:
 *   firebase/landing/kosullar/index.html  (Kullanım Koşulları / EULA)
 *   firebase/landing/gizlilik/index.html  (Gizlilik Politikası)
 * Yayın: `cd firebase && firebase deploy --only hosting:altin-kasam`
 * Basit Markdown alt kümesi desteklenir: başlık, paragraf, liste, kalın, bağlantı, alıntı.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  { src: 'docs/legal/kullanim-kosullari.md', out: 'firebase/landing/kosullar/index.html', title: 'Kullanım Koşulları (EULA)' },
  { src: 'PRIVACY.md', out: 'firebase/landing/gizlilik/index.html', title: 'Gizlilik Politikası' },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(text) {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>');
  return s;
}

function render(md) {
  const out = [];
  let para = [];
  let list = null;
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
    if (list) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`);
    list = null;
  };
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    // Depo içi notlar (yayın talimatı) sayfada gösterilmez.
    if (line.startsWith('>')) { flush(); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { flush(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } (list ??= []).push(li[1]); continue; }
    if (list && /^\s{2,}/.test(raw)) { list[list.length - 1] += ` ${line.trim()}`; continue; }
    if (list) flush();
    para.push(line.trim());
  }
  flush();
  return out.join('\n');
}

const page = (title, body) => `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title} · Altın Kasam</title>
<meta name="theme-color" content="#0D1014">
<link rel="icon" href="/img/icon.png">
<style>
:root{--bg:#0D1014;--card:#171B23;--line:rgba(255,255,255,.08);--gold:#F2C862;--text:#F3F0EA;--mut:#9AA1AE}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}
main{max-width:760px;margin:0 auto;padding:32px 16px 64px}
a{color:var(--gold);word-break:break-word}
h1{font-size:1.7rem;line-height:1.25;margin:8px 0 16px}
h2{font-size:1.15rem;margin:32px 0 8px;color:var(--gold)}
p,li{color:var(--text);font-size:1rem}
ul{padding-left:20px}
code{background:var(--card);padding:1px 5px;border-radius:4px}
.back{display:inline-block;margin-bottom:8px;font-size:.9rem;text-decoration:none}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:.85rem}
</style>
</head>
<body>
<main>
<a class="back" href="/">← Altın Kasam</a>
${body}
<footer><a href="/kosullar">Kullanım Koşulları</a> · <a href="/gizlilik">Gizlilik Politikası</a> · altinkasamapp@gmail.com</footer>
</main>
</body>
</html>
`;

for (const p of PAGES) {
  const html = page(p.title, render(readFileSync(join(root, p.src), 'utf8')));
  const target = join(root, p.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
  console.log('yazıldı:', p.out);
}
