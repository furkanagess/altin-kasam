import type { HomeWidgetProps } from '@/src/domain/models';
import { Box, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  offset,
  padding,
  paddingAll,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget } from 'expo-widgets';

const PriceWidget = (props: HomeWidgetProps) => {
  'widget';
  // Widget çalışma ortamı modül kapsamını görmez; renkler burada tanımlı olmalı.
  const palette = {
    background: '#FFF8EC',
    ink: '#14181F',
    muted: '#5C6573',
    faint: '#8A93A1',
    gold: '#8A6428',
    silver: '#6F7886',
    up: '#1F7A4C',
    upTint: '#E1F2E8',
    down: '#B42318',
    downTint: '#FBE4E1',
  };
  const accent = props.metal === 'silver' ? palette.silver : palette.gold;
  // Uygulamadaki metal rozetiyle aynı renkler: arkada koyu, önde parlak külçe.
  const bar =
    props.metal === 'silver'
      ? { badge: '#E6E9EE', back: '#9AA3B0', front: '#C9CED6', shine: '#F4F6F9' }
      : { badge: '#F6E9C8', back: '#C9962B', front: '#E3B23C', shine: '#FBE7A1' };
  const icon = (
    <Box contentAlignment="center" modifiers={[size(30, 30), cornerRadius(15), background(bar.badge)]}>
      <Box modifiers={[offset(2, -3), size(13, 6), cornerRadius(2), background(bar.back)]} />
      <Box modifiers={[offset(-1, 3), size(16, 7), cornerRadius(2), background(bar.front)]} />
      <Box modifiers={[offset(-1, 1.5), size(10, 2), cornerRadius(1), background(bar.shine)]} />
    </Box>
  );
  const container = [fillMaxSize(), cornerRadius(20), background(palette.background), paddingAll(14)];

  if (props.locked) {
    return (
      <Column modifiers={container}>
        <Row verticalAlignment="top" modifiers={[fillMaxWidth()]}>
          <Text color={accent} style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.6 }} modifiers={[weight(1)]}>
            ALTIN KASAM
          </Text>
          {icon}
        </Row>
        <Text color={palette.muted} maxLines={1} style={{ fontSize: 12 }}>
          {props.title}
        </Text>
        <Spacer modifiers={[weight(1)]} />
        <Text color={palette.ink} style={{ fontSize: 17, fontWeight: '700' }}>Uygulamayı aç</Text>
        <Text color={palette.muted} maxLines={2} style={{ fontSize: 11 }}>
          Canlı fiyat uygulama açılınca gelir.
        </Text>
      </Column>
    );
  }

  return (
    <Column modifiers={container}>
      <Row verticalAlignment="top" modifiers={[fillMaxWidth()]}>
        <Column modifiers={[weight(1)]}>
          <Text color={accent} maxLines={1} style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
            {props.title}
          </Text>
          <Text color={palette.faint} maxLines={1} style={{ fontSize: 11, fontWeight: '500' }}>
            {props.subtitle}
          </Text>
        </Column>
        {icon}
      </Row>
      <Spacer modifiers={[weight(1)]} />
      <Text color={palette.ink} maxLines={1} style={{ fontSize: 24, fontWeight: '700' }}>
        {props.price}
      </Text>
      <Spacer modifiers={[height(6)]} />
      <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
        <Text
          color={props.up ? palette.up : palette.down}
          style={{ fontSize: 11, fontWeight: '700' }}
          modifiers={[
            cornerRadius(10),
            background(props.up ? palette.upTint : palette.downTint),
            padding(7, 3, 7, 3),
          ]}
        >
          {props.change}
        </Text>
        <Spacer modifiers={[weight(1)]} />
        <Text color={palette.faint} style={{ fontSize: 10, fontWeight: '500' }}>
          {props.updatedAt}
        </Text>
      </Row>
    </Column>
  );
};

export default createWidget('PriceWidget', PriceWidget, {
  locked: true,
  metal: 'gold',
  title: 'GRAM ALTIN',
  subtitle: '24 ayar · Alış',
  price: '—',
  change: '',
  up: true,
  updatedAt: '',
  url: 'altinkasam:///widget',
});
