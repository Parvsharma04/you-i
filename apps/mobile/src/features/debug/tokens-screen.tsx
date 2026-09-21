import { ScrollView, Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { FONT_FAMILY } from '@/lib/fonts';
import {
  CATEGORY_NAMES,
  categoryColors,
  resolveTheme,
  themeTokens,
  type CategoryName,
  type ColorScheme,
} from '@/theme';

const paletteNames = [
  'surface',
  'card',
  'ink',
  'ink2',
  'ink3',
  'line',
] as const;
const categoryClassNames: Record<CategoryName, string> = {
  love: 'bg-category-love',
  friendship: 'bg-category-friendship',
  deepTalk: 'bg-category-deepTalk',
  fun: 'bg-category-fun',
  spicy: 'bg-category-spicy',
};

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <View className="mb-4 w-[155px]">
      <View
        accessibilityLabel={`${label} ${color}`}
        className="h-16 rounded-card border border-line"
        style={{ backgroundColor: color }}
      />
      <Text className="mt-2 font-body text-sm text-ink">{label}</Text>
      <Text className="font-body text-xs text-ink-2">{color}</Text>
    </View>
  );
}

function Palette({ scheme }: { scheme: ColorScheme }) {
  const theme = resolveTheme(scheme);
  return (
    <View className="mb-6">
      <Text className="mb-3 font-display-700 text-2xl text-ink">
        {scheme} palette
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {paletteNames.map((name) => (
          <Swatch key={name} label={name} color={theme[name]} />
        ))}
      </View>
    </View>
  );
}

export default function TokensScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerClassName="px-5 pb-12 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-display-800 text-[52px] leading-[58px] text-ink">
          Theme tokens
        </Text>
        <Text className="mb-8 font-body text-base text-ink-2">
          All palettes, category tints, type sizes, and the spicy dark override.
        </Text>

        <Palette scheme="light" />
        <Palette scheme="dark" />

        <Text className="mb-3 font-display-700 text-2xl text-ink">
          Category tints
        </Text>
        <View className="mb-6 flex-row flex-wrap justify-between">
          {CATEGORY_NAMES.map((name) => (
            <View key={name} className="mb-4 w-[155px]">
              <View
                className={`h-16 rounded-card ${categoryClassNames[name]}`}
              />
              <Text className="mt-2 font-body text-sm text-ink">{name}</Text>
              <Text className="font-body text-xs text-ink-2">
                {categoryColors[name]}
              </Text>
            </View>
          ))}
        </View>

        <Text className="mb-3 font-display-700 text-2xl text-ink">
          Resolved layers
        </Text>
        <View className="mb-6 gap-3">
          {CATEGORY_NAMES.map((category) => {
            const theme = resolveTheme('light', category);
            return (
              <View
                key={category}
                className="flex-row items-center rounded-card bg-card p-4"
              >
                <View
                  className="mr-3 h-8 w-8 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                />
                <Text className="font-body-600 text-base text-ink">
                  {category}: {theme.scheme} palette
                </Text>
              </View>
            );
          })}
        </View>

        <Text className="mb-3 font-display-700 text-2xl text-ink">
          Type scale
        </Text>
        <View className="gap-3">
          {Object.entries(themeTokens.type).map(([name, size]) => (
            <Text
              key={name}
              className="font-display text-ink"
              style={{ fontSize: size, lineHeight: size * 1.15 }}
            >
              {name} · {size}
            </Text>
          ))}
        </View>

        <Text className="mb-3 mt-8 font-display-700 text-2xl text-ink">
          Geometry
        </Text>
        <Text className="font-body text-base text-ink-2">
          Radius: tile {themeTokens.radius.tile}, card {themeTokens.radius.card}
          , screen {themeTokens.radius.screen}
        </Text>
        <Text className="mt-2 font-body text-base text-ink-2">
          Spacing: {Object.values(themeTokens.spacing).join(' · ')}
        </Text>
        <Text
          className="mt-2 font-body text-base text-ink-2"
          style={{ fontFamily: FONT_FAMILY.body }}
        >
          Shadow: {themeTokens.shadow}
        </Text>
      </ScrollView>
    </Screen>
  );
}
