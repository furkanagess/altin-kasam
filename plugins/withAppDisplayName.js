/**
 * Uygulamanın görünen adı "Altın Kasam"dır, ama `app.json` > `name` ASCII ("Altin Kasam") tutulur.
 * Nedeni: EAS Build, kimlik bilgilerini hedef adıyla ("AltnKasam": ASCII olmayan harfi atar) hazırlar,
 * prebuild ise Xcode hedefini "AltinKasam" (harfi dönüştürür) diye üretir; adlar uyuşmayınca iOS
 * derlemesi "Configure Xcode project" aşamasında boş bir hatayla çöker. ASCII `name` ile ikisi de
 * "AltinKasam" olur. Görünen ad burada iOS (CFBundleDisplayName) ve Android (app_name) için geri verilir.
 */
const { withInfoPlist, withStringsXml } = require('expo/config-plugins');

const DISPLAY_NAME = 'Altın Kasam';

module.exports = function withAppDisplayName(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.CFBundleDisplayName = DISPLAY_NAME;
    return c;
  });
  return withStringsXml(config, (c) => {
    const strings = c.modResults.resources.string ?? [];
    const entry = strings.find((s) => s.$.name === 'app_name');
    if (entry) entry._ = DISPLAY_NAME;
    else strings.push({ $: { name: 'app_name' }, _: DISPLAY_NAME });
    c.modResults.resources.string = strings;
    return c;
  });
};
