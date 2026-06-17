/**
 * Shared UX/UI tokens: spacing rhythm, touch targets, elevation, type scale.
 * Aligns with common mobile patterns (44pt min touch, 8pt grid, readable contrast).
 */
import { Platform } from 'react-native';

import { colors } from './theme';

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  }),
  lift: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }),
};

/** Minimum recommended touch target (Apple HIG / Material). */
export const minTouchTarget = 44;

export const hitSlopComfortable = { top: 12, bottom: 12, left: 12, right: 12 } as const;

export const typography = {
  screenTitle: {
    fontSize: 32,
    letterSpacing: -0.55,
    color: colors.text,
  },
  sectionHeading: {
    fontSize: 22,
    letterSpacing: -0.35,
    color: colors.text,
  },
  subsection: {
    fontSize: 18,
    letterSpacing: -0.25,
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  bodyMuted: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  caption: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: colors.text,
  },
} as const;

/** Visual feedback on press (complements accessibility labels). */
export function fadePressed(pressed: boolean, opacity = 0.88) {
  return pressed ? { opacity } : {};
}
