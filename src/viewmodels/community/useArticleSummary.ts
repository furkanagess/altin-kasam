import type { ArticleSummary } from '@/src/data/datasources/articleTypes';
import { articleRepository } from '@/src/data/repositories/articleRepository';
import { useEffect, useState } from 'react';

type State = { url: string | undefined; summary: ArticleSummary | null; failed: boolean };

/** Haber sayfasından çıkarılan özet; adres yoksa ya da alınamazsa `summary` boş kalır. */
export function useArticleSummary(url: string | undefined) {
  const [state, setState] = useState<State>({ url: undefined, summary: null, failed: false });

  useEffect(() => {
    if (!url) return;
    let alive = true;
    articleRepository
      .getSummary(url)
      .then((summary) => {
        if (alive) setState({ url, summary, failed: false });
      })
      .catch(() => {
        if (alive) setState({ url, summary: null, failed: true });
      });
    return () => {
      alive = false;
    };
  }, [url]);

  const current = state.url === url;
  return {
    summary: current ? state.summary : null,
    loading: !!url && !current,
    failed: current && state.failed,
  };
}
