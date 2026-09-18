import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, OptionTile, Screen, Text } from '@/components/ui';
import type { TextColor, TextVariant } from '@/components/ui/text';

const COLOR_SWATCHES: Array<{ label: string; token: string; hex: string }> = [
  { label: 'bg-primary', token: 'bg-bg-primary', hex: '#fff0f5' },
  { label: 'bg-secondary', token: 'bg-bg-secondary', hex: '#ffe4e1' },
  { label: 'bg-card', token: 'bg-bg-card', hex: '#ffffff' },
  { label: 'text-primary', token: 'bg-text-primary', hex: '#8b0000' },
  { label: 'text-secondary', token: 'bg-text-secondary', hex: '#a52a2a' },
  { label: 'text-muted', token: 'bg-text-muted', hex: '#cd5c5c' },
  { label: 'accent', token: 'bg-accent', hex: '#ff1493' },
  { label: 'border-color', token: 'bg-border-color', hex: '#8b0000' },
];

const TYPE_SAMPLES: Array<{ variant: TextVariant; label: string }> = [
  { variant: 'display-xl', label: 'Display XL — h1' },
  { variant: 'display-lg', label: 'Display LG — h2' },
  { variant: 'display-md', label: 'Display MD — h3' },
  { variant: 'body', label: 'Body — Space Mono 400' },
  { variant: 'body-sm', label: 'Body SM — 0.9rem' },
  { variant: 'body-xs', label: 'Body XS — 0.85rem' },
];

const TEXT_COLORS: TextColor[] = ['primary', 'secondary', 'muted', 'accent'];

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="display-md" className="mb-3 mt-8">
      {children}
    </Text>
  );
}

/**
 * Scratch route — /debug/tokens — for checking every color, type size, and
 * primitive on a real device. Not linked from app navigation; navigate to
 * it directly (e.g. `router.push('/debug/tokens')` or by typing the path
 * into the dev menu deep link field). Not part of the shipped product UI.
 */
export default function TokensScreen() {
  const [selected, setSelected] = useState<number | null>(0);

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="p-5 pb-15"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="display-xl">Design Tokens</Text>
        <Text variant="body-sm" color="secondary">
          Scratch route — apps/mobile/src/features/debug/tokens-screen.tsx
        </Text>

        <SectionTitle>Colors</SectionTitle>
        <View className="flex-row flex-wrap gap-3">
          {COLOR_SWATCHES.map((swatch) => (
            <View key={swatch.label} className="w-[150px]">
              <View
                className={`h-16 border-3 border-border-color ${swatch.token}`}
              />
              <Text variant="body-xs" className="mt-1">
                {swatch.label}
              </Text>
              <Text variant="body-xs" color="muted">
                {swatch.hex}
              </Text>
            </View>
          ))}
        </View>

        <SectionTitle>Type scale</SectionTitle>
        <View className="gap-2">
          {TYPE_SAMPLES.map((sample) => (
            <Text key={sample.variant} variant={sample.variant}>
              {sample.label}
            </Text>
          ))}
        </View>

        <SectionTitle>Text colors</SectionTitle>
        <View className="gap-1">
          {TEXT_COLORS.map((color) => (
            <Text key={color} variant="body" color={color}>
              text color: {color}
            </Text>
          ))}
        </View>

        <SectionTitle>Button</SectionTitle>
        <View className="flex-row flex-wrap gap-4">
          <Button title="Primary" onPress={() => {}} />
          <Button title="Disabled" disabled onPress={() => {}} />
        </View>

        <SectionTitle>Card</SectionTitle>
        <Card>
          <Text variant="display-md">Glass card</Text>
          <Text variant="body" color="secondary" className="mt-2">
            Native port of `.glass-card` — bg-card, 3px border, retro shadow.
          </Text>
        </Card>

        <SectionTitle>OptionTile (MCQ choice)</SectionTitle>
        <View className="mt-2">
          {['Option A', 'Option B', 'Option C'].map((label, index) => (
            <OptionTile
              key={label}
              label={label}
              selected={selected === index}
              onPress={() => setSelected(index)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
