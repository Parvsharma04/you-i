import { View, type ViewProps } from 'react-native';

import { cx } from '@/lib/cx';

import { RetroShadowBox } from './retro-shadow-box';

export type CardProps = ViewProps & {
  shadowSize?: 'sm' | 'md' | 'lg';
};

/** Native port of web's `.glass-card` (globals.css: bg-card, 3px border, shadow-retro, p-6). */
export function Card({
  shadowSize = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <RetroShadowBox
      size={shadowSize}
      className={cx('bg-bg-card p-6', className)}
      {...props}
    >
      <View>{children}</View>
    </RetroShadowBox>
  );
}
