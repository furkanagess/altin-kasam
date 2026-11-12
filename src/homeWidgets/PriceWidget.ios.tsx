import type { HomeWidgetProps } from '@/src/domain/models';
import { HStack, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  offset,
  padding,
  shapes,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

const PriceWidget = (props: HomeWidgetProps, environment: WidgetEnvironment) => {
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
    <ZStack modifiers={[frame({ width: 30, height: 30 }), background(bar.badge, shapes.circle())]}>
      <RoundedRectangle
        cornerRadius={2}
        modifiers={[frame({ width: 13, height: 6 }), foregroundStyle(bar.back), offset({ x: 2, y: -3 })]}
      />
      <RoundedRectangle
        cornerRadius={2}
        modifiers={[frame({ width: 16, height: 7 }), foregroundStyle(bar.front), offset({ x: -1, y: 3 })]}
      />
      <RoundedRectangle
        cornerRadius={1}
        modifiers={[frame({ width: 10, height: 2 }), foregroundStyle(bar.shine), offset({ x: -1, y: 1.5 })]}
      />
    </ZStack>
  );
  const large = environment.widgetFamily === 'systemMedium';
  const container = [
    containerBackground(palette.background, 'widget'),
    frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' as const }),
    widgetURL(props.url),
  ];

  if (props.locked) {
    return (
      <VStack alignment="leading" spacing={2} modifiers={container}>
        <HStack alignment="top">
          <Text modifiers={[font({ size: 11, weight: 'bold' }), kerning(0.6), foregroundStyle(accent)]}>ALTIN KASAM</Text>
          <Spacer />
          {icon}
        </HStack>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(palette.muted), lineLimit(1)]}>{props.title}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(palette.ink)]}>Pro’ya özel</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(palette.muted), lineLimit(2)]}>
          Canlı fiyat için dokun.
        </Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={0} modifiers={container}>
      <HStack alignment="top" spacing={6}>
        <VStack alignment="leading" spacing={0}>
          <Text
            modifiers={[
              font({ size: large ? 13 : 12, weight: 'bold' }),
              kerning(0.5),
              foregroundStyle(accent),
              lineLimit(1),
              minimumScaleFactor(0.7),
            ]}
          >
            {props.title}
          </Text>
          <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(palette.faint), lineLimit(1)]}>
            {props.subtitle}
          </Text>
        </VStack>
        <Spacer />
        {icon}
      </HStack>
      <Spacer />
      <Text
        modifiers={[
          font({ size: large ? 32 : 24, weight: 'bold', design: 'rounded' }),
          monospacedDigit(),
          foregroundStyle(palette.ink),
          lineLimit(1),
          minimumScaleFactor(0.5),
        ]}
      >
        {props.price}
      </Text>
      <HStack spacing={6} alignment="center" modifiers={[padding({ top: 6 })]}>
        <Text
          modifiers={[
            font({ size: 11, weight: 'bold' }),
            monospacedDigit(),
            foregroundStyle(props.up ? palette.up : palette.down),
            padding({ horizontal: 7, vertical: 3 }),
            background(props.up ? palette.upTint : palette.downTint, shapes.capsule()),
          ]}
        >
          {props.change}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 10, weight: 'medium' }), monospacedDigit(), foregroundStyle(palette.faint)]}>
          {props.updatedAt}
        </Text>
      </HStack>
    </VStack>
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
