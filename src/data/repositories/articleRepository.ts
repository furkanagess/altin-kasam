import type { ArticleSummary } from '@/src/data/datasources/articleTypes';
import { fetchJson } from '@/src/data/datasources/http';

const ENDPOINT = '/api/article';
/** Sunucu sayfayı çekip yayıncının önizleme açıklamasını okur; ağır sitelerde birkaç saniye sürebilir. */
const TIMEOUT_MS = 15_000;

/** Haber özetleri oturum boyunca saklanır; aynı habere dönünce yeniden istenmez. */
export class ArticleRepository {
  private readonly cache = new Map<string, Promise<ArticleSummary>>();

  getSummary(url: string): Promise<ArticleSummary> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    const summary = fetchJson<ArticleSummary>(`${ENDPOINT}?url=${encodeURIComponent(url)}`, TIMEOUT_MS);
    this.cache.set(url, summary);
    summary.catch(() => {
      if (this.cache.get(url) === summary) this.cache.delete(url);
    });
    return summary;
  }
}

export const articleRepository = new ArticleRepository();
