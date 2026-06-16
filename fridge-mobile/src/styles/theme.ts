import { useColorScheme } from 'react-native';

type ThemeColors = {
  background: string;
  surface: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  primary: string;
  primarySurface: string;
  danger: string;
  dangerSurface: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
};

export type AppTheme = {
  colors: ThemeColors;
  radius: {
    card: number;
    pill: number;
  };
};

export const lightTheme: AppTheme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F8FBF9',
    card: '#FFFFFF',
    text: '#173B33',
    mutedText: '#60706B',
    border: '#DDE8E2',
    primary: '#427F85',
    primarySurface: '#E8F3F0',
    danger: '#BD2020',
    dangerSurface: '#F9E6E6',
    success: '#2E6F5E',
    successSurface: '#DDF1EA',
    warning: '#7A5A1D',
    warningSurface: '#F3EEE1',
  },
  radius: {
    card: 30,
    pill: 999,
  },
};

export const darkTheme: AppTheme = {
  colors: {
    background: '#070c0b',
    surface: '#14211E',
    card: '#192a26df',
    text: '#F4FBF8',
    mutedText: '#B7C8C1',
    border: '#2A403A',
    primary: '#5798a0',
    primarySurface: '#0a1312',
    danger: '#F08A84',
    dangerSurface: '#291615',
    success: '#87d8bec8',
    successSurface: '#213d35',
    warning: '#E2BF74',
    warningSurface: '#44361F',
  },
  radius: {
    card: 30,
    pill: 999,
  },
};

export function useAppTheme(): AppTheme {
  const colorScheme = useColorScheme();

  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
