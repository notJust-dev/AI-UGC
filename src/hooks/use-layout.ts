import { useWindowDimensions } from 'react-native';

import { MaxContentWidth, REGULAR_WIDTH, Spacing } from '@/constants/theme';

/**
 * Layout follows the window size, never the device or hinge state, so the app
 * adapts to iPhone Duo closed (compact) and open (regular), split view,
 * tablets and desktop web.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isRegular = width >= REGULAR_WIDTH;
  const gutter = isRegular ? Spacing.six : Spacing.four;
  const contentWidth = Math.min(width, MaxContentWidth);

  /** Number of 9:16 tiles per row in a grid. */
  const gridColumns = Math.max(2, Math.floor((contentWidth - gutter * 2) / (isRegular ? 210 : 165)));
  const gridItemWidth =
    (contentWidth - gutter * 2 - Spacing.three * (gridColumns - 1)) / gridColumns;

  /** Width of a card in a horizontal carousel. */
  const carouselItemWidth = isRegular ? 200 : Math.round(width * 0.4);

  return { width, height, isRegular, gutter, contentWidth, gridColumns, gridItemWidth, carouselItemWidth };
}
