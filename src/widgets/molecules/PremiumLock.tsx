import { PremiumBlur } from '@/src/widgets/molecules/PremiumBlur';
import React, { type ReactNode } from 'react';
import { Pressable } from 'react-native';

type Props = {
  locked: boolean;
  /** Kilitliyken dokununca (ör. ödeme ekranı). */
  onLockedPress: () => void;
  label?: string;
  accessibilityLabel: string;
  children: ReactNode;
};

/** Pro içeriği bulanık gösterir ve tamamını tek dokunuşla ödeme ekranına bağlar; kilit açıksa içerik olduğu gibi. */
export function PremiumLock({ locked, onLockedPress, label, accessibilityLabel, children }: Props) {
  if (!locked) return <>{children}</>;
  return (
    <Pressable onPress={onLockedPress} accessibilityRole="button" accessibilityLabel={`${accessibilityLabel}, Pro`}>
      <PremiumBlur locked label={label}>
        {children}
      </PremiumBlur>
    </Pressable>
  );
}
