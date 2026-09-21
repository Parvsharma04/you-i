import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

export type RetroShadowSize = 'sm' | 'md' | 'lg';

/**
 * RN box-shadows are always blurred, so web's hard-edge "retro" shadow
 * (`4px 4px 0px var(--border-color)`, `shadow-retro`/`-sm`/`-lg` in
 * tailwind.config.js) can't be applied as a `shadow-*` className directly.
 * This fakes it the standard neo-brutalism way: a solid border-color plate
 * sits behind the real surface, offset by the shadow size. Button animates
 * `offset` toward 0 on press to reproduce `shadow-retro-hover`/`-active`.
 */
export function RetroShadowBox({
  size = 'md',
  children,
  ...props
}: ViewProps & { size?: RetroShadowSize }) {
  const theme = useTheme();
  const offset = size === 'sm' ? 3 : size === 'lg' ? 6 : 4;
  return (
    <View style={{ position: 'relative' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: theme.line,
          transform: [{ translateX: offset }, { translateY: offset }],
        }}
      />
      <View
        {...props}
        style={[
          {
            position: 'relative',
            borderWidth: 1.5,
            borderColor: theme.line,
          },
          props.style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
