import { makeStyles, useTheme } from '@/src/core/theme';
import React, { useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = { url: string };

/** Sayfayı uygulamanın içinde, uygulama başlığı altında açar; üstte yükleme çubuğu. */
export function InAppBrowser({ url }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [progress, setProgress] = useState(0);

  return (
    <View style={styles.root}>
      {progress < 1 ? (
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${Math.max(progress, 0.05) * 100}%` }]} />
        </View>
      ) : null}
      <WebView
        source={{ uri: url }}
        style={styles.web}
        onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
        allowsBackForwardNavigationGestures
        decelerationRate="normal"
        setSupportMultipleWindows={false}
        startInLoadingState={false}
        containerStyle={{ backgroundColor: colors.surface.canvas }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  track: { height: 2, backgroundColor: colors.brand.goldSoft },
  bar: { height: 2, backgroundColor: colors.brand.gold },
  web: { flex: 1 },
}));
