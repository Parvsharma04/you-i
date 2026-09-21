import {
  createContext,
  useState,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import { resolveTheme, type CategoryName, type ThemeTokens } from './tokens';

type ThemeContextValue = ThemeTokens & {
  setCategory: (category: CategoryName | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = PropsWithChildren<{
  category?: CategoryName | null;
  onCategoryChange?: (category: CategoryName | null) => void;
}>;

export function ThemeProvider({
  category,
  onCategoryChange,
  children,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [internalCategory, setInternalCategory] = useState<CategoryName | null>(
    category ?? null,
  );
  const scheme = systemScheme === 'dark' ? 'dark' : 'light';
  const activeCategory = category === undefined ? internalCategory : category;
  const theme = useMemo(
    () => resolveTheme(scheme, activeCategory),
    [activeCategory, scheme],
  );
  const value = useMemo(
    () => ({
      ...theme,
      setCategory: (nextCategory: CategoryName | null) => {
        if (category === undefined) {
          setInternalCategory(nextCategory);
        }
        onCategoryChange?.(nextCategory);
      },
    }),
    [category, onCategoryChange, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return theme;
}
