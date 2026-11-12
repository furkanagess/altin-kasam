import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { engagementDatasource } from '@/src/data/datasources/engagementDatasource';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

/** Açılış ve ekran görüntüleme olaylarını gönderir; ekrana hiçbir şey çizmez. */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    analyticsDatasource.track({ name: 'app_opened' });
    void engagementDatasource.update((s) => ({ sessions: s.sessions + 1 }));
  }, []);

  useEffect(() => {
    analyticsDatasource.track({ name: 'screen_viewed', path: pathname });
  }, [pathname]);

  return null;
}
