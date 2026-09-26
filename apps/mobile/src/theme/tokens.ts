export const CATEGORY_NAMES = [
  'love',
  'friendship',
  'deepTalk',
  'fun',
  'spicy',
] as const;

export type CategoryName = (typeof CATEGORY_NAMES)[number];
export type ColorScheme = 'light' | 'dark';

export const categoryColors = {
  love: '#FF5C8A',
  friendship: '#FF9147',
  deepTalk: '#5B5BE6',
  fun: '#EFB91F',
  spicy: '#FF3D68',
} as const satisfies Record<CategoryName, string>;

const lightPalette = {
  surface: '#F4F3F8',
  card: '#FFFFFF',
  ink: '#17141F',
  ink2: '#5E586E',
  ink3: '#928CA3',
  line: '#E8E5F0',
} as const;

const darkPalette = {
  surface: '#100D16',
  card: '#1C1826',
  ink: '#F2EFF7',
  ink2: lightPalette.ink2,
  ink3: lightPalette.ink3,
  line: '#2E2839',
} as const;

export const themeTokens = {
  palettes: {
    light: lightPalette,
    dark: darkPalette,
  },
  category: categoryColors,
  radius: {
    tile: 18,
    card: 22,
    screen: 32,
  },
  spacing: {
    4: 4,
    8: 8,
    12: 12,
    16: 16,
    22: 22,
    32: 32,
    48: 48,
    screenGutter: 22,
  },
  type: {
    display: 52,
    heading: 34,
    title: 24,
    bodyLarge: 18,
    body: 16,
    bodySmall: 14,
    caption: 12.5,
  },
  shadow: '0 8px 24px -12px rgba(23,20,31,.22)',
} as const;

export type ThemeTokens = {
  scheme: ColorScheme;
  activeCategory: CategoryName | null;
  surface: string;
  card: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  accent: string;
  category: typeof categoryColors;
  radius: typeof themeTokens.radius;
  spacing: typeof themeTokens.spacing;
  type: typeof themeTokens.type;
  shadow: typeof themeTokens.shadow;
};

export function resolveTheme(
  scheme: ColorScheme,
  activeCategory: CategoryName | null = null,
): ThemeTokens {
  const resolvedScheme = activeCategory === 'spicy' ? 'dark' : scheme;
  const palette = themeTokens.palettes[resolvedScheme];

  return {
    ...palette,
    scheme: resolvedScheme,
    activeCategory,
    accent: activeCategory
      ? themeTokens.category[activeCategory]
      : themeTokens.category.love,
    category: themeTokens.category,
    radius: themeTokens.radius,
    spacing: themeTokens.spacing,
    type: themeTokens.type,
    shadow: themeTokens.shadow,
  };
}
