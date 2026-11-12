/** `app/api/article+api.ts` yanıtı: yayıncının paylaşım önizlemesi; haber metni içermez. */
export type ArticleSummary = {
  /** Yönlendirmelerden sonraki asıl haber adresi. */
  url: string;
  siteName: string | null;
  /** Sayfanın kendi açıklaması (og:description). */
  description: string | null;
};
