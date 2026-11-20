import { ADSENSE_CLIENT, ADSENSE_SLOTS } from '@/src/core/constants/ads';
import { paddings } from '@/src/core/theme';
import React, { useEffect, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';

type Props = {
  /** Reklam alanının kimliği (`ADSENSE_SLOTS` anahtarı); kap `#ad-slot-<id>` olarak da işaretlenir. */
  id: string;
  width?: number;
  height?: number;
};

type AdsWindow = Window & { adsbygoogle?: unknown[] };

const SCRIPT_ID = 'adsbygoogle-js';

/** AdSense betiği sayfada bir kez ve yalnızca dolu bir reklam alanı çizilince yüklenir. */
function ensureAdSenseScript() {
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(script);
}

/**
 * Web reklam alanı (Google AdSense). `ADSENSE_SLOTS`'ta bu alanın birim numarası varsa AdSense birimi
 * çizilir; yoksa alan yalnızca yer ayırır (boş, görünmez). Sayfa kayarken üstte kalır.
 * Standart dikey birim 300×600 ("half page"). AdMob web'de çalışmaz.
 */
export function WebAdSlot({ id, width = 300, height = 600 }: Props) {
  const slot = ADSENSE_SLOTS[id];
  const pushed = useRef(false);

  useEffect(() => {
    if (!slot || pushed.current) return;
    pushed.current = true;
    ensureAdSenseScript();
    try {
      const w = window as AdsWindow;
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // Reklam yüklenemezse alan boş kalır; sayfa etkilenmez.
    }
  }, [slot]);

  const style = { width, minHeight: height, position: 'sticky', top: paddings.sm } as unknown as ViewStyle;
  return (
    <View nativeID={`ad-slot-${id}`} style={style} aria-hidden={!slot}>
      {slot ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width, height }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
        />
      ) : null}
    </View>
  );
}
