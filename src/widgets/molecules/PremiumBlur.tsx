import { makeStyles, radii, useTheme } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import { BlurTargetView, BlurView } from 'expo-blur';
import React, { useRef, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  /** `false` ise içerik olduğu gibi gösterilir. */
  locked: boolean;
  label?: string;
  children: ReactNode;
};

/**
 * Pro içeriği gerçek sonuçla çizer ama bulanık gösterir. Bulanık katman ekran
 * okuyucudan da gizlenir; sonuç ancak kilit açılınca okunur.
 */
export function PremiumBlur({ locked, label = 'Pro ile gör', children }: Props) {
  const styles = useStyles();
  const { scheme } = useTheme();
  const targetRef = useRef<ComponentRef<typeof View> | null>(null);
  if (!locked) return <>{children}</>;

  return (
    <View style={styles.wrap}>
      <BlurTargetView
        ref={targetRef}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </BlurTargetView>
      <BlurView
        blurTarget={targetRef}
        blurMethod="dimezisBlurView"
        intensity={28}
        tint={scheme}
        style={styles.blur}
      >
        <AppText
          variant="bodyStrong"
          style={styles.label}
          accessibilityLabel={`${label}, Pro özellik`}
        >
          🔒 {label}
        </AppText>
      </BlurView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { borderRadius: radii.md, overflow: 'hidden' },
  blur: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.brand.goldDeep },
}));
