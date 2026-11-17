import type { RefObject } from 'react';

export type TourRect = { x: number; y: number; width: number; height: number };

type Measurable = {
  measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => void;
};

/** Turda aydınlatılabilen öğeler; ekranlar kendilerini kimlikle kaydeder, render'ı etkilemez. */
const targets = new Map<string, RefObject<Measurable | null>>();

export function registerTourTarget(id: string, ref: RefObject<Measurable | null>): () => void {
  targets.set(id, ref);
  return () => {
    if (targets.get(id) === ref) targets.delete(id);
  };
}

/** Öğenin pencere içindeki konumu; kayıtlı değilse ya da görünmüyorsa null. */
export function measureTourTarget(id: string): Promise<TourRect | null> {
  const node = targets.get(id)?.current;
  if (!node) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      node.measureInWindow((x, y, width, height) => {
        resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    } catch {
      resolve(null);
    }
  });
}

type Scroller = { scrollTo: (y: number, animated: boolean) => void; offset: () => number };

/** Turun kaydırabildiği ekranlar (ör. Piyasa); `Screen` kendini `scrollId` ile kaydeder. */
const scrollers = new Map<string, Scroller>();

export function registerTourScroller(id: string, scroller: Scroller): () => void {
  scrollers.set(id, scroller);
  return () => {
    if (scrollers.get(id) === scroller) scrollers.delete(id);
  };
}

/** Hedef verilmezse en üste, verilirse hedefi `topInset` hizasına gelecek şekilde kaydırır. */
export async function scrollTourTo(scrollerId: string, targetId: string | undefined, topInset: number): Promise<boolean> {
  const scroller = scrollers.get(scrollerId);
  if (!scroller) return false;
  if (!targetId) {
    scroller.scrollTo(0, true);
    return true;
  }
  const rect = await measureTourTarget(targetId);
  if (!rect) return false;
  scroller.scrollTo(Math.max(0, scroller.offset() + rect.y - topInset), true);
  return true;
}
