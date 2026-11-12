import type { GoldAssetDefinition } from '@/src/core/constants/goldAssets';
import { GoldForm, GoldKarat } from '@/src/domain/enums';
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';

type Shape = 'bar' | 'coin' | 'bangle';

/**
 * Ürünün büyüklüğünü ikon sayısıyla anlatır: gram 1 külçe, çeyrek 2 sikke …
 * reşat/cumhuriyet/gremse 5 sikke, Ata 5'li 6 sikke, 10 gr bilezik 1, 20 gr bilezik 2.
 */
function iconSpec(asset: GoldAssetDefinition): { shape: Shape; count: number } {
  switch (asset.form) {
    case GoldForm.Ata5:
      return { shape: 'coin', count: 6 };
    case GoldForm.Gram:
      return { shape: 'bar', count: 1 };
    case GoldForm.Bilezik:
      return { shape: 'bangle', count: Math.max(1, Math.round(asset.gramWeight / 10)) };
    case GoldForm.Quarter:
      return { shape: 'coin', count: 2 };
    case GoldForm.Half:
      return { shape: 'coin', count: 3 };
    case GoldForm.Full:
      return { shape: 'coin', count: 4 };
    default:
      return { shape: 'coin', count: 5 };
  }
}

/** Ayar düştükçe renk açılır (14 ayar en soluk). */
const PALETTE: Record<GoldKarat, { fill: string; edge: string; shine: string }> = {
  [GoldKarat.K24]: { fill: '#E3B23C', edge: '#9A6B12', shine: '#FBE7A1' },
  [GoldKarat.K22]: { fill: '#DDAF4C', edge: '#99712A', shine: '#F8E3A8' },
  [GoldKarat.K18]: { fill: '#D8BA72', edge: '#9B814A', shine: '#F4E6BF' },
  [GoldKarat.K14]: { fill: '#D9C79E', edge: '#9F8D66', shine: '#F3EAD3' },
};

/** Eski basım, aynı ikonun soluk hâli; adındaki "Eski" ile birlikte ayırt edilir. */
const OLD_EDITION_STYLE = { opacity: 0.6 } as const;

const UNIT = 48;
/** Üst üste binen ikonlar arası kaydırma (birim genişliğin oranı). */
const OVERLAP = 0.34;

function Bar({ fill, edge, shine }: (typeof PALETTE)[GoldKarat]) {
  return (
    <G>
      <Polygon points="6,36 42,36 35,14 13,14" fill={fill} stroke={edge} strokeWidth={2} strokeLinejoin="round" />
      <Polygon points="13,14 35,14 32,20 16,20" fill={shine} opacity={0.9} />
      <Path d="M12 31 H36" stroke={edge} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
    </G>
  );
}

function Coin({ fill, edge, shine, ornate }: (typeof PALETTE)[GoldKarat] & { ornate: boolean }) {
  return (
    <G>
      <Circle cx={24} cy={24} r={17} fill={fill} stroke={edge} strokeWidth={2} />
      <Circle cx={24} cy={24} r={12} fill="none" stroke={edge} strokeWidth={1.4} opacity={0.6} strokeDasharray={ornate ? '2 2' : undefined} />
      <Path d="M14 18 A12 12 0 0 1 24 12" stroke={shine} strokeWidth={3} strokeLinecap="round" fill="none" />
      {ornate ? (
        <Polygon points="24,17 26,22 31,22 27,25 28.5,30 24,27 19.5,30 21,25 17,22 22,22" fill={edge} opacity={0.75} />
      ) : null}
    </G>
  );
}

function Bangle({ fill, edge, shine }: (typeof PALETTE)[GoldKarat]) {
  return (
    <G>
      <Ellipse cx={24} cy={26} rx={18} ry={11} fill="none" stroke={edge} strokeWidth={8} />
      <Ellipse cx={24} cy={26} rx={18} ry={11} fill="none" stroke={fill} strokeWidth={5} />
      <Path d="M10 22 A18 11 0 0 1 24 15" stroke={shine} strokeWidth={2} strokeLinecap="round" fill="none" />
    </G>
  );
}

type Props = {
  asset: GoldAssetDefinition;
  /** Tek ikonun boyu (px); genişlik ikon sayısıyla artar. */
  size?: number;
  /** Verilirse çok sikkeli ikonlar bu genişliğe sığacak kadar küçülür (dar liste alanları). */
  maxWidth?: number;
};

export function GoldAssetIcon({ asset, size: requestedSize = 32, maxWidth }: Props) {
  const { shape, count } = iconSpec(asset);
  const colors = PALETTE[asset.karat];
  const step = UNIT * OVERLAP;
  const viewWidth = UNIT + step * (count - 1);
  const size = maxWidth ? Math.min(requestedSize, (maxWidth * UNIT) / viewWidth) : requestedSize;
  const ornate =
    asset.form === GoldForm.Resat || asset.form === GoldForm.Cumhuriyet || asset.form === GoldForm.Ata5;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={asset.edition === 'eski' ? OLD_EDITION_STYLE : undefined}
    >
      <Svg width={(size * viewWidth) / UNIT} height={size} viewBox={`0 0 ${viewWidth} ${UNIT}`}>
        {Array.from({ length: count }, (_, i) => (
          // Arkadan öne çizilir; en öndeki ikon en sağda.
          <G key={i} transform={`translate(${i * step} 0)`}>
            {shape === 'bar' ? <Bar {...colors} /> : null}
            {shape === 'coin' ? <Coin {...colors} ornate={ornate} /> : null}
            {shape === 'bangle' ? <Bangle {...colors} /> : null}
          </G>
        ))}
      </Svg>
    </View>
  );
}
