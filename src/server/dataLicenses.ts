/**
 * Ticari kullanımı kaynağın yazılı iznine bağlı veriler (yalnızca sunucu). İzin alınınca kod
 * değişmeden sunucu ortam değişkeniyle açılır; kapalıyken bu veriler hiç indirilmez.
 *
 * - TCMB: "Sitede yer alan bilgilerin ticari amaçlarla kullanımı TCMB'nin yazılı iznine tabidir."
 *   Kapalıyken Piyasa Katılımcıları Anketi beklentileri ve karar metninden alıntı/ton çıkarımı
 *   kullanılmaz; kamuya duyurulmuş karar ve oranlar kaynak gösterilerek gösterilir.
 * - Cleveland Fed: içerik yalnızca ticari olmayan kullanım için serbest; kapalıyken ABD enflasyon
 *   anlık tahmini kullanılmaz.
 */
export const dataLicenses = {
  get tcmb(): boolean {
    return process.env.TCMB_COMMERCIAL_PERMISSION === '1';
  },
  get clevelandFed(): boolean {
    return process.env.CLEVELAND_FED_PERMISSION === '1';
  },
};
