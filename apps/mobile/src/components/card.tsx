import { View, ViewProps } from 'react-native';
import type { PropsWithChildren, ReactNode } from 'react';

interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  bordered?: boolean;
}

interface CardSectionProps extends ViewProps {
  children: ReactNode;
  className?: string;
}

/**
 * Standardized card component with consistent padding, radius, and
 * light/dark theming.
 *
 * - Default padding: `p-4`
 * - Border radius: `rounded-lg`
 * - Background: white in light mode, gray-800 in dark mode
 * - Optional border: `border border-gray-200 dark:border-gray-700`
 */
export function Card({
  children,
  className = '',
  noPadding = false,
  bordered = false,
  ...props
}: CardProps) {
  const paddingClass = noPadding ? '' : 'p-4';
  const borderClass = bordered
    ? 'border border-gray-200 dark:border-gray-700'
    : '';

  return (
    <View
      className={`rounded-lg bg-white dark:bg-gray-800 ${paddingClass} ${borderClass} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

/** Optional card header section. */
export function CardHeader({
  children,
  className = '',
  ...props
}: CardSectionProps) {
  return (
    <View className={`mb-3 ${className}`} {...props}>
      {children}
    </View>
  );
}

/** Optional card body section. */
export function CardBody({
  children,
  className = '',
  ...props
}: CardSectionProps) {
  return (
    <View className={`${className}`} {...props}>
      {children}
    </View>
  );
}

/** Optional card footer section. */
export function CardFooter({
  children,
  className = '',
  ...props
}: CardSectionProps) {
  return (
    <View className={`mt-3 ${className}`} {...props}>
      {children}
    </View>
  );
}

/*
Example usage:

<Card>
  <Text className="text-lg font-bold">Title</Text>
  <Text className="text-sm text-gray-600">Description</Text>
</Card>

<Card bordered noPadding>
  <CardHeader className="p-4 pb-0">
    <Text className="text-lg font-bold">Header</Text>
  </CardHeader>
  <CardBody className="p-4">
    <Text className="text-sm text-gray-600">Body content</Text>
  </CardBody>
  <CardFooter className="p-4 pt-0">
    <Text className="text-xs text-gray-500">Footer</Text>
  </CardFooter>
</Card>
*/
