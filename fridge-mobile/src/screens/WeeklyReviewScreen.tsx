import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { type AppTheme, useAppTheme } from '@/styles/theme';
import { typography } from '@/styles/typography';

export function WeeklyReviewScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScreenContainer>
      <Text style={styles.title}>Weekly Review</Text>
      <Text style={styles.description}>
        A placeholder for reviewing fridge items, upcoming expirations, and cleanup tasks.
      </Text>
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  title: {
    ...typography.screenTitle,
    fontSize: 28,
    color: theme.colors.text,
  },
  description: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
  });
