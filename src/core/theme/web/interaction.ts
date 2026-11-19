import { darkColors, lightColors } from '@/src/core/theme/colors';

/**
 * Web etkileşim durumları (imleç, hover, klavye odağı). Bileşenlere tek tek eklenmez:
 * react-native-web etkileşimli öğeleri `button` ya da odaklanabilir `role` ile çizer, bu CSS
 * `app/+html.tsx` üzerinden hepsine birden uygulanır. Native'i etkilemez.
 *
 * Hover, zemin rengini değiştirmek yerine üstüne yarı saydam katman (`background-image`) bindirir;
 * böylece her zemin rengiyle (altın buton, kart, saydam satır) çalışır ve metni soldurmaz.
 */
const INTERACTIVE = ':is(button, a[href], [role="button"], [role="link"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"])';
const ENABLED = ':not(:disabled):not([aria-disabled="true"])';

export const webInteractionCss = `
:root { --app-hover: rgba(20, 24, 31, 0.05); --app-focus: ${lightColors.brand.gold}; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --app-hover: rgba(242, 238, 230, 0.07); --app-focus: ${darkColors.brand.gold}; }
}
:root[data-theme="dark"] { --app-hover: rgba(242, 238, 230, 0.07); --app-focus: ${darkColors.brand.gold}; }

${INTERACTIVE}${ENABLED} { cursor: pointer; }
@media (hover: hover) and (pointer: fine) {
  ${INTERACTIVE}${ENABLED}:hover {
    background-image: linear-gradient(var(--app-hover), var(--app-hover));
  }
}
${INTERACTIVE}:focus { outline: none; }
${INTERACTIVE}:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--app-focus);
  outline-offset: 2px;
}
`;
