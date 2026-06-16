import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { routes } from '@/navigation/routes';
import { getFridgeItems } from '@/services/api';
import { type AppTheme, useAppTheme } from '@/styles/theme';
import { typography } from '@/styles/typography';
import { FridgeItem } from '@/types/product';

const userName = 'Frankie';
const millisecondsPerDay = 1000 * 60 * 60 * 24;

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
}

function getExpirationDateKey(expirationDate: string) {
  return expirationDate.slice(0, 10);
}

function parseDateKey(dateKey: string) {
  return new Date(dateKey + 'T00:00:00');
}

function getDaysUntilExpiration(expirationDate: string) {
  const today = parseDateKey(getDateKey(new Date()));
  const expiration = parseDateKey(getExpirationDateKey(expirationDate));

  return Math.round((expiration.getTime() - today.getTime()) / millisecondsPerDay);
}

function formatExpiration(expirationDate: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(parseDateKey(getExpirationDateKey(expirationDate)));
}

function formatDaysLeft(daysLeft: number) {
  if (daysLeft < 0) {
    return 'Expired';
  }

  if (daysLeft === 0) {
    return 'Today';
  }

  if (daysLeft === 1) {
    return '1 day';
  }

  return daysLeft + ' days';
}

function isActiveItem(item: FridgeItem) {
  return item.status === 'active';
}

function isExpired(item: FridgeItem) {
  return item.expirationDate ? getDaysUntilExpiration(item.expirationDate) < 0 : false;
}

function isExpiringSoon(item: FridgeItem) {
  if (!item.expirationDate) {
    return false;
  }

  const daysLeft = getDaysUntilExpiration(item.expirationDate);
  return daysLeft >= 0 && daysLeft <= 7;
}

export function HomeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadItems() {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          const fridgeItems = await getFridgeItems();

          if (isMounted) {
            setItems(fridgeItems.filter(isActiveItem));
          }
        } catch (error) {
          if (isMounted) {
            setErrorMessage(error instanceof Error ? error.message : 'Could not load fridge items');
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }

      loadItems();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const productsToUseFirst = useMemo(
    () =>
      [...items]
        .filter((item) => item.expirationDate)
        .sort((firstItem, secondItem) => {
          const firstDate = firstItem.expirationDate ? getExpirationDateKey(firstItem.expirationDate) : '';
          const secondDate = secondItem.expirationDate ? getExpirationDateKey(secondItem.expirationDate) : '';

          return firstDate.localeCompare(secondDate);
        }),
    [items],
  );

  const expiringSoonCount = useMemo(() => items.filter(isExpiringSoon).length, [items]);
  const expiredCount = useMemo(() => items.filter(isExpired).length, [items]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi, {userName}</Text>
          <Text style={styles.title}>This is what is in your fridge</Text>
        </View>

        <View style={styles.summaryRow}>
          <Pressable
            disabled={isLoading}
            style={[styles.summaryCard, isLoading && styles.summaryCardDisabled]}
            onPress={() => router.push(routes.inventory)}>
            <Text style={styles.summaryValue}>{isLoading ? '-' : items.length}</Text>
            <Text style={styles.summaryLabel}>Total items</Text>
          </Pressable>

          <Pressable
            disabled={isLoading}
            style={[styles.summaryCard, isLoading && styles.summaryCardDisabled]}
            onPress={() => router.push((routes.inventory + '?filter=expiring') as never)}>
            <Text style={styles.summaryValue}>{isLoading ? '-' : expiringSoonCount}</Text>
            <Text style={styles.summaryLabel}>Close to expiration</Text>
          </Pressable>

          <Pressable
            disabled={isLoading}
            style={[styles.summaryCard, isLoading && styles.summaryCardDisabled]}
            onPress={() => router.push((routes.inventory + '?filter=expired') as never)}>
            <Text style={[styles.summaryValue, expiredCount > 0 && styles.expiredSummaryValue]}>
              {isLoading ? '-' : expiredCount}
            </Text>
            <Text style={styles.summaryLabel}>Expired items</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Use first</Text>
            <Text style={styles.description}>Nearest dates stay on top.</Text>
          </View>

          <View style={styles.productList}>
            {isLoading ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Loading fridge</Text>
                <Text style={styles.stateText}>Checking your inventory.</Text>
              </View>
            ) : errorMessage ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Could not load Home</Text>
                <Text style={styles.stateText}>{errorMessage}</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Your fridge is empty</Text>
                <Text style={styles.stateText}>Add a product to start tracking what to use first.</Text>
              </View>
            ) : productsToUseFirst.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>No expiration dates yet</Text>
                <Text style={styles.stateText}>Items with expiration dates will appear here.</Text>
              </View>
            ) : (
              productsToUseFirst.map((product) => {
                const daysLeft = product.expirationDate
                  ? getDaysUntilExpiration(product.expirationDate)
                  : 0;

                return (
                  <View
                    key={product.id}
                    style={[styles.productRow, daysLeft < 0 && styles.expiredProductRow]}>
                    <View style={styles.productDetails}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productMeta}>Quantity: {product.quantity}</Text>
                    </View>
                    {product.expirationDate ? (
                      <View style={styles.expirationBadge}>
                        <Text style={styles.expirationDate}>{formatExpiration(product.expirationDate)}</Text>
                        <Text style={[styles.expirationMeta, daysLeft < 0 && styles.expiredMeta]}>
                          {formatDaysLeft(daysLeft)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </View>

        <Pressable style={styles.button} onPress={() => router.push(routes.inventory)}>
          <Text style={styles.buttonText}>Open my fridge</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  content: {
    gap: 30,
    paddingBottom: 100,
  },
  header: {
    paddingTop: 30,
    gap: 20,
  },
  greeting: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.primary,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 30,
    color: theme.colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 100,
    gap: 4,
    padding: 16,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
  },
  summaryCardDisabled: {
    opacity: 0.6,
  },
  summaryValue: {
    ...typography.screenTitle,
    fontSize: 28,
    color: theme.colors.text,
  },
  expiredSummaryValue: {
    color: theme.colors.danger,
  },
  summaryLabel: {
    ...typography.body,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  section: {
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    color: theme.colors.text,
  },
  description: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.mutedText,
  },
  productList: {
    gap: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
  },
  expiredProductRow: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSurface,
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  productName: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  productMeta: {
    ...typography.body,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  expirationBadge: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 76,
  },
  expirationDate: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  expirationMeta: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.danger,
  },
  expiredMeta: {
    color: theme.colors.danger,
  },
  stateCard: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  stateTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    color: theme.colors.text,
  },
  stateText: {
    ...typography.body,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.card,
  },
  });
