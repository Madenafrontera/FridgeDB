import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { type AppTheme, useAppTheme } from '@/styles/theme';
import { typography } from '@/styles/typography';

export function SettingsAboutScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ title?: string; body?: string }>();
  const title = params.title ?? 'About';
  const body = params.body ?? 'More information will be added here later.';

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
        </View>

        <Text style={styles.body}>{body}</Text>

        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go back</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  content: {
    gap: 24,
    paddingTop: 18,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: theme.colors.primarySurface,
  },
  backButtonText: {
    ...typography.sectionTitle,
    marginTop: -2,
    fontSize: 34,
    color: theme.colors.text,
  },
  title: {
    ...typography.screenTitle,
    flex: 1,
    fontSize: 30,
    color: theme.colors.text,
  },
  body: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.card,
  },
  });
