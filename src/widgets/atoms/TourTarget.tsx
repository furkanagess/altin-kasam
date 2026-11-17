import { registerTourTarget } from '@/src/viewmodels/tour/tourTargets';
import React, { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Uygulama turunda aydınlatılabilecek öğeyi işaretler; görünümü değiştirmez. */
export function TourTarget({ id, style, children }: { id: string; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => registerTourTarget(id, ref), [id]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
