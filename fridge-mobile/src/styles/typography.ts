import { Platform } from 'react-native';

export const fontFamilies = {
  display: Platform.select({
    web: 'Plus Jakarta Sans, system-ui, sans-serif',
    default: 'sans-serif',
  }),
  body: Platform.select({
    web: 'DM Sans, system-ui, sans-serif',
    default: 'sans-serif',
  }),
} as const;

export const typography = {
  screenTitle: {
    fontFamily: fontFamilies.display,
    fontWeight: '800',
  },
  sectionTitle: {
    fontFamily: fontFamilies.display,
    fontWeight: '700',
  },
  body: {
    fontFamily: fontFamilies.body,
    fontWeight: '400',
  },
  bodyMedium: {
    fontFamily: fontFamilies.body,
    fontWeight: '500',
  },
  bodySemiBold: {
    fontFamily: fontFamilies.body,
    fontWeight: '600',
  },
} as const;
