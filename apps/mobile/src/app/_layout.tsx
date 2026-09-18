import { CATEGORIES } from '@youandi/shared';

// Smoke test: confirms @youandi/shared resolves correctly through the
// pnpm workspace + Metro config. Safe no-op in production.
if (__DEV__) {
  console.log(`[@youandi/shared] categories: ${CATEGORIES.join(', ')}`);
}

export { default } from '@/features/navigation/root-layout';
