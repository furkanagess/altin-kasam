import { communityRepository } from '@/src/data/repositories/communityRepository';
import type { CommunityPost } from '@/src/domain/models';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type CommunityContextValue = {
  state: LoadState;
  error: string | null;
  posts: CommunityPost[];
  hashtags: string[];
  selectedHashtag: string | null;
  setSelectedHashtag: (tag: string | null) => void;
  refresh: () => Promise<void>;
  getPost: (id: string) => Promise<CommunityPost | null>;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const hashtags = useMemo(() => communityRepository.listHashtags(), []);

  const refresh = useCallback(async () => {
    setState((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const feed = await communityRepository.getFeed(selectedHashtag ?? undefined);
      setPosts(feed);
      setError(null);
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Topluluk akışı alınamadı');
      setState('error');
    }
  }, [selectedHashtag]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getPost = useCallback(async (id: string) => {
    return communityRepository.getPost(id);
  }, []);

  const value = useMemo(
    () => ({
      state,
      error,
      posts,
      hashtags,
      selectedHashtag,
      setSelectedHashtag,
      refresh,
      getPost,
    }),
    [
      state,
      error,
      posts,
      hashtags,
      selectedHashtag,
      refresh,
      getPost,
    ],
  );

  return (
    <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
  );
}

export function useCommunityViewModel(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) {
    throw new Error('useCommunityViewModel must be used within CommunityProvider');
  }
  return ctx;
}
