import { makeStyles } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { View } from 'react-native';

type Props = { url: string };

/**
 * Web'de WebView yoktur; sayfa iframe'de açılır. Pek çok haber sitesi çerçevelemeyi
 * engellediği için altta yeni sekmede açma bağlantısı da bulunur.
 */
export function InAppBrowser({ url }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <iframe src={url} title="Haber" style={{ flex: 1, border: 0, width: '100%', height: '100%' }} />
      <AppText
        variant="caption"
        tone="gold"
        style={styles.fallback}
        onPress={() => window.open(url, '_blank', 'noopener')}
      >
        Sayfa görünmüyorsa yeni sekmede aç
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  fallback: { textAlign: 'center', paddingVertical: 10 },
}));
