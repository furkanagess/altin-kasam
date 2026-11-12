import { InAppBrowser } from '@/src/widgets/organisms/InAppBrowser';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

/** Haberin asıl kaynağı, uygulamadan çıkmadan; başlıkta kaynak adı. */
export default function ReaderScreen() {
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();
  const safeUrl = url && /^https?:\/\//.test(url) ? url : null;
  return (
    <>
      <Stack.Screen options={{ title: title || 'Haber' }} />
      {safeUrl ? <InAppBrowser url={safeUrl} /> : null}
    </>
  );
}
