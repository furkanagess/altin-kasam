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
