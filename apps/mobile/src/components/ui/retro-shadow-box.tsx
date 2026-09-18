import { View, type ViewProps } from 'react-native';

import { cx } from '@/lib/cx';

const OFFSET_CLASS = {
  sm: 'translate-x-[3px] translate-y-[3px]',
  md: 'translate-x-[4px] translate-y-[4px]',
  lg: 'translate-x-[6px] translate-y-[6px]',
} as const;

export type RetroShadowSize = keyof typeof OFFSET_CLASS;

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
  className,
  children,
  ...props
}: ViewProps & { size?: RetroShadowSize }) {
  return (
    <View className="relative">
      <View
        pointerEvents="none"
        className={cx('absolute inset-0 bg-border-color', OFFSET_CLASS[size])}
      />
      <View
        className={cx('relative border-3 border-border-color', className)}
        {...props}
      >
        {children}
      </View>
    </View>
  );
}
