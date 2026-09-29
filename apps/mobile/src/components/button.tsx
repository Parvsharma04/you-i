import { Text, Pressable, ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: ViewStyle;
}

/**
 * Standardized button component used across the app.
 *
 * - Three visual variants: primary (accent), secondary (subtle), ghost (bordered).
 * - Three sizes: sm (40px), md (48px), lg (56px).
 * - Dark mode support via `dark:` Tailwind variants.
 * - Disabled state lowers opacity and blocks press.
 */
export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  className = '',
  style,
}: ButtonProps) {
  const sizeClasses = {
    sm: 'h-10 px-4',
    md: 'h-12 px-6',
    lg: 'h-14 px-8',
  }[size];

  const variantClasses = {
    primary: 'bg-accent text-white dark:bg-accent dark:text-white',
    secondary:
      'bg-bg-secondary text-text-primary dark:bg-bg-secondary dark:text-text-primary',
    ghost:
      'bg-transparent text-text-primary border-2 border-border-color dark:bg-transparent dark:text-text-primary dark:border-border-color',
  }[variant];

  const baseClasses =
    'items-center justify-center rounded-tile font-body-700 text-label active:opacity-80';
  const disabledClasses = disabled ? 'opacity-50' : 'opacity-100';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${disabledClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text className="font-body-700 text-label text-center text-current">
        {label}
      </Text>
    </Pressable>
  );
}

/*
Example usage:

<Button
  label="Start Game"
  onPress={() => navigate('lobby')}
  variant="primary"
  size="md"
/>

<Button
  label="Cancel"
  onPress={() => router.back()}
  variant="ghost"
  size="sm"
/>
*/
