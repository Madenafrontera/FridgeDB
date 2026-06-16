import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { routes } from '@/navigation/routes';
import { deleteFridgeItem, getFridgeItems } from '@/services/api';
import { refreshFridgeNotifications } from '@/services/notifications';
import { type AppTheme, useAppTheme } from '@/styles/theme';
import { typography } from '@/styles/typography';
import { FridgeItem, ProductCategory } from '@/types/product';

type FilterOption = 'All' | 'Close to expire' | 'Expired' | ProductCategory;

const filters: FilterOption[] = [
  'All',
  'Close to expire',
  'Expired',
  'Frozen',
  'Daily',
  'Vegetables',
  'Fruits',
  'Meat',
  'Drinks',
  'Extras',
  'Leftovers',
];

const millisecondsPerDay = 1000 * 60 * 60 * 24;

const categoryFilters: ProductCategory[] = [
  'Frozen',
  'Daily',
  'Vegetables',
  'Fruits',
  'Meat',
  'Drinks',
  'Extras',
  'Leftovers',
];

const categoryLabels: Record<FilterOption, string> = {
  All: 'All',
  'Close to expire': 'Close to expire',
  Expired: 'Expired',
  Frozen: 'Frozen',
  Daily: 'Daily',
  Vegetables: 'Vegetables',
  Meat: 'Meat',
  Drinks: 'Drinks and liquids',
  Extras: 'Extras',
  Fruits: 'Fruits',
  Leftovers: 'Leftovers',
};

const categoryIdToCategory: Record<string, ProductCategory> = {
  '1': 'Daily',
  '2': 'Vegetables',
  '3': 'Fruits',
  '4': 'Meat',
  '5': 'Drinks',
  '6': 'Extras',
  '7': 'Leftovers',
  '8': 'Frozen',
};

const categoryIcons: Partial<Record<ProductCategory, string>> = {
  Daily: '🥛',
  Vegetables: '🥬',
  Fruits: '🍎',
  Meat: '🥩',
  Drinks: '🧃',
  Extras: '🥫',
  Leftovers: '🍱',
  Frozen: '🧊',
};

const iconIdToIcon: Record<string, string> = {
  '1': '🥛',
  '2': '🧀',
  '3': '🥚',
  '4': '🥬',
  '5': '🥩',
  '6': '🧃',
  '7': '🍎',
  '8': '🥡',
  '9': '🍱',
  '10': '🧊',
};

function getItemCategory(item: FridgeItem) {
  return categoryIdToCategory[item.categoryId] ?? 'Extras';
}

function getItemIcon(item: FridgeItem, category: ProductCategory) {
  return iconIdToIcon[item.iconId] ?? categoryIcons[category] ?? '🍽️';
}

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

function isExpired(item: FridgeItem) {
  return item.expirationDate ? getDaysUntilExpiration(item.expirationDate) < 0 : false;
}

function isCloseToExpiration(item: FridgeItem) {
  if (!item.expirationDate) {
    return false;
  }

  const daysLeft = getDaysUntilExpiration(item.expirationDate);
  return daysLeft >= 0 && daysLeft <= 7;
}

function sortByExpirationDate(firstItem: FridgeItem, secondItem: FridgeItem) {
  const firstDate = firstItem.expirationDate ? getExpirationDateKey(firstItem.expirationDate) : '';
  const secondDate = secondItem.expirationDate ? getExpirationDateKey(secondItem.expirationDate) : '';

  return firstDate.localeCompare(secondDate);
}

function formatExpiration(expirationDate: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateKey(getExpirationDateKey(expirationDate)));
}

function getFilterFromParam(filter: string | string[] | undefined): FilterOption {
  const value = Array.isArray(filter) ? filter[0] : filter;

  if (value === 'expiring') {
    return 'Close to expire';
  }

  if (value === 'expired') {
    return 'Expired';
  }

  return 'All';
}

export function InventoryScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>(() => getFilterFromParam(filter));
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFilter(getFilterFromParam(filter));
  }, [filter]);

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const fridgeItems = await getFridgeItems();
      setItems(fridgeItems);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load fridge items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function loadFocusedItems() {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          const fridgeItems = await getFridgeItems();

          if (isMounted) {
            setItems(fridgeItems);
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

      loadFocusedItems();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const visibleItems = useMemo(() => {
    if (selectedFilter === 'All') {
      return items;
    }

    if (selectedFilter === 'Close to expire') {
      return items.filter(isCloseToExpiration).sort(sortByExpirationDate);
    }

    if (selectedFilter === 'Expired') {
      return items.filter(isExpired).sort(sortByExpirationDate);
    }

    if (categoryFilters.includes(selectedFilter)) {
      return items.filter((item) => getItemCategory(item) === selectedFilter);
    }

    return items;
  }, [items, selectedFilter]);

  async function confirmDelete(item: FridgeItem) {
    try {
      setDeletingItemId(item.id);
      await deleteFridgeItem(item.id);
      await loadItems();
      await refreshFridgeNotifications();
    } catch (error) {
      Alert.alert(
        'Could not delete item',
        error instanceof Error ? error.message : 'Check that the backend is running and try again.',
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  function handleDeletePress(item: FridgeItem) {
    Alert.alert('Delete item?', 'Remove ' + item.name + ' from your fridge?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void confirmDelete(item);
        },
      },
    ]);
  }

  function handleEditPress(item: FridgeItem) {
    router.push((routes.editProduct + '?id=' + item.id) as never);
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>My fridge</Text>
            <Text style={styles.title}>
              {selectedFilter === 'All'
                ? items.length + ' items stored'
                : visibleItems.length + ' ' + categoryLabels[selectedFilter]}
            </Text>
          </View>

          <Pressable style={styles.addButton} onPress={() => router.push(routes.addProduct)}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {filters.map((filter) => {
            const isSelected = selectedFilter === filter;

            return (
              <Pressable
                key={filter}
                style={[styles.filterButton, isSelected && styles.filterButtonSelected]}
                onPress={() => setSelectedFilter(filter)}>
                <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                  {categoryLabels[filter]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {isLoading ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Loading items</Text>
              <Text style={styles.stateText}>Checking your fridge inventory.</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Could not load items</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
            </View>
          ) : visibleItems.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>No items found</Text>
              <Text style={styles.stateText}>Your fridge inventory is empty for this view.</Text>
            </View>
          ) : (
            visibleItems.map((item) => {
              const category = getItemCategory(item);
              const isDeleting = deletingItemId === item.id;
              const daysLeft = item.expirationDate
                ? getDaysUntilExpiration(item.expirationDate)
                : null;
              const isExpired = daysLeft !== null && daysLeft < 0;

              return (
                <View key={item.id} style={[styles.itemCard, isExpired && styles.expiredItemCard]}>
                  <Pressable
                    style={styles.itemMain}
                    onPress={() => handleEditPress(item)}>
                    <Text style={styles.itemIcon}>{getItemIcon(item, category)}</Text>

                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>{categoryLabels[category]}</Text>
                      <Text style={styles.itemMeta}>Quantity: {item.quantity}</Text>
                      {item.expirationDate ? (
                        <Text style={[styles.expiration, isExpired && styles.expiredText]}>
                          {isExpired ? 'Expired' : 'Expires ' + formatExpiration(item.expirationDate)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>

                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEditPress(item)}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>

                    <Pressable
                      disabled={isDeleting}
                      style={[styles.actionButton, styles.deleteButton, isDeleting && styles.actionButtonDisabled]}
                      onPress={() => handleDeletePress(item)}>
                      <Text style={styles.deleteButtonText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  content: {
    gap: 22,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 18,
  },
  eyebrow: {
    ...typography.bodySemiBold,
    fontSize: 15,
    color: theme.colors.primary,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 30,
    color: theme.colors.text,
  },
  addButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  addButtonText: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.card,
  },
  filters: {
    gap: 10,
    paddingRight: 24,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  filterButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  filterText: {
    ...typography.bodyMedium,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  filterTextSelected: {
    color: theme.colors.text,
  },
  list: {
    gap: 14,
    paddingBottom: 50,
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
  itemCard: {
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  expiredItemCard: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSurface,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 44,
    fontSize: 24,
    backgroundColor: theme.colors.surface,
  },
  itemDetails: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    ...typography.sectionTitle,
    fontSize: 18,
    color: theme.colors.text,
  },
  itemMeta: {
    ...typography.body,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  expiration: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.danger,
  },
  expiredText: {
    color: theme.colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: theme.radius.card,
  },
  actionButtonDisabled: {
    opacity: 0.65,
  },
  editButton: {
    backgroundColor: theme.colors.primarySurface,
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
  },
  editButtonText: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  deleteButtonText: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.card,
  },
  });
