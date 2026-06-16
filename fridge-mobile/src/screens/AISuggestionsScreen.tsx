import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenContainer } from '@/components/ScreenContainer';
import { getFridgeItems, suggestRecipes } from '@/services/api';
import { type AppTheme, useAppTheme } from '@/styles/theme';
import { typography } from '@/styles/typography';
import { FridgeItem, RecipeSuggestion } from '@/types/product';

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
}

function getExpirationDateKey(item: FridgeItem) {
  return item.expirationDate?.slice(0, 10) ?? null;
}

function isItemNotExpired(item: FridgeItem, todayDateKey: string) {
  const expirationDateKey = getExpirationDateKey(item);

  return !expirationDateKey || expirationDateKey >= todayDateKey;
}

function compareByExpirationDate(firstItem: FridgeItem, secondItem: FridgeItem) {
  const firstExpirationDate = getExpirationDateKey(firstItem);
  const secondExpirationDate = getExpirationDateKey(secondItem);

  if (firstExpirationDate && secondExpirationDate && firstExpirationDate !== secondExpirationDate) {
    return firstExpirationDate.localeCompare(secondExpirationDate);
  }

  if (firstExpirationDate && !secondExpirationDate) {
    return -1;
  }

  if (!firstExpirationDate && secondExpirationDate) {
    return 1;
  }

  return firstItem.name.localeCompare(secondItem.name);
}

function formatExpirationMeta(item: FridgeItem) {
  const expirationDateKey = getExpirationDateKey(item);

  if (!expirationDateKey) {
    return 'No expiration date';
  }

  return 'Expires ' + expirationDateKey;
}

export function AISuggestionsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableItems = useMemo(() => {
    const todayDateKey = getTodayDateKey();

    return items
      .filter(
        (item) =>
          item.status === 'active' &&
          item.name.trim().length > 0 &&
          isItemNotExpired(item, todayDateKey),
      )
      .sort(compareByExpirationDate);
  }, [items]);

  const selectedItems = useMemo(
    () => availableItems.filter((item) => selectedItemIds.includes(item.id)),
    [availableItems, selectedItemIds],
  );

  const selectedIngredientNames = useMemo(
    () => selectedItems.map((item) => item.name.trim()).filter(Boolean),
    [selectedItems],
  );

  const soonExpiringItemIds = useMemo(
    () =>
      availableItems
        .filter((item) => getExpirationDateKey(item))
        .slice(0, 3)
        .map((item) => item.id),
    [availableItems],
  );

  const hasAvailableItems = availableItems.length > 0;
  const hasSelectedItems = selectedIngredientNames.length > 0;
  const allAvailableItemsSelected =
    hasAvailableItems && availableItems.every((item) => selectedItemIds.includes(item.id));

  const loadItems = useCallback(async () => {
    try {
      setIsLoadingItems(true);
      setErrorMessage(null);

      const fridgeItems = await getFridgeItems();
      const todayDateKey = getTodayDateKey();
      const activeItemIds = fridgeItems
        .filter(
          (item) =>
            item.status === 'active' &&
            item.name.trim().length > 0 &&
            isItemNotExpired(item, todayDateKey),
        )
        .map((item) => item.id);

      setItems(fridgeItems);
      setSelectedItemIds((currentIds) =>
        currentIds.filter((itemId) => activeItemIds.includes(itemId)),
      );

      if (activeItemIds.length === 0) {
        setSuggestions([]);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load fridge items');
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems]),
  );

  function toggleSelectedItem(itemId: number) {
    setSelectedItemIds((currentIds) => {
      if (currentIds.includes(itemId)) {
        return currentIds.filter((currentId) => currentId !== itemId);
      }

      return [...currentIds, itemId];
    });
    setSuggestions([]);
    setErrorMessage(null);
  }

  function handleSelectAllPress() {
    setSelectedItemIds(allAvailableItemsSelected ? [] : availableItems.map((item) => item.id));
    setSuggestions([]);
    setErrorMessage(null);
  }

  async function handleGeneratePress() {
    if (!hasSelectedItems) {
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const recipeSuggestions = await suggestRecipes(selectedIngredientNames);
      setSuggestions(recipeSuggestions);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  }

  const isSelectDisabled = isLoadingItems || !hasAvailableItems;
  const isGenerateDisabled = isLoadingItems || isGenerating || !hasSelectedItems;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Chef AI</Text>
            <Text style={styles.title}>AI Meal Suggestions</Text>
            <Text style={styles.description}>
              Pick non-expired fridge items and generate meal ideas from only those ingredients.
            </Text>
          </View>

          <View style={styles.selectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionText}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                <Text style={styles.sectionDescription}>
                  {hasSelectedItems
                    ? selectedIngredientNames.length + ' selected'
                    : 'Select the fridge items to use.'}
                </Text>
              </View>

              <Pressable
                disabled={isSelectDisabled}
                style={[styles.secondaryButton, isSelectDisabled && styles.disabledButton]}
                onPress={() => setIsSelectorOpen(true)}>
                <Text style={styles.secondaryButtonText}>Select Items</Text>
              </Pressable>
            </View>

            {isLoadingItems ? (
              <View style={styles.stateBlock}>
                <Text style={styles.stateTitle}>Loading fridge items</Text>
                <Text style={styles.stateText}>Checking what is available.</Text>
              </View>
            ) : !hasAvailableItems ? (
              <View style={styles.stateBlock}>
                <Text style={styles.stateTitle}>No usable ingredients</Text>
                <Text style={styles.stateText}>
                  Add non-expired fridge items before generating meal ideas.
                </Text>
              </View>
            ) : hasSelectedItems ? (
              <View style={styles.selectedItemsBlock}>
                <Text style={styles.selectedItemsLabel}>Selected for Generate Ideas</Text>
                <View style={styles.chipList}>
                  {selectedItems.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.selectedChip}
                      onPress={() => toggleSelectedItem(item.id)}>
                      <Text style={styles.selectedChipText}>{item.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.stateBlock}>
                <Text style={styles.stateTitle}>No items selected</Text>
                <Text style={styles.stateText}>
                  Tap Select Items and choose at least one ingredient.
                </Text>
              </View>
            )}

            <Pressable
              disabled={isGenerateDisabled}
              style={[styles.generateButton, isGenerateDisabled && styles.disabledButton]}
              onPress={handleGeneratePress}>
              <Text style={styles.generateButtonText}>
                {isGenerating ? 'Generating...' : 'Generate Ideas'}
              </Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Could not generate ideas</Text>
              <Text style={styles.stateText}>{errorMessage}</Text>
            </View>
          ) : suggestions.length > 0 ? (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>Meal ideas</Text>
              <View style={styles.list}>
                {suggestions.map((suggestion, index) => {
                  const extraIngredients = suggestion.extraIngredients.filter(Boolean);
                  const recipeTypeLabel =
                    suggestion.recipeType === 'strict' ? 'Uses only selected items' : 'Flexible recipe';

                  return (
                    <View key={suggestion.title + index} style={styles.suggestionCard}>
                      <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                      <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                      <View style={styles.suggestionMeta}>
                        <Text style={styles.metaText}>{suggestion.difficulty}</Text>
                        <Text style={styles.metaText}>{suggestion.estimatedTimeMinutes} min</Text>
                        <Text style={styles.metaText}>
                          {suggestion.estimatedProteinGrams}g protein
                        </Text>
                        <Text style={styles.metaText}>{suggestion.estimatedCalories} cal</Text>
                        <Text style={styles.metaText}>{recipeTypeLabel}</Text>
                      </View>
                      {suggestion.recipeType === 'flexible' && extraIngredients.length > 0 ? (
                        <Text style={styles.extraIngredientsText}>
                          Needs extra ingredients: {extraIngredients.join(', ')}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : hasSelectedItems ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Ready to generate</Text>
              <Text style={styles.stateText}>
                FridgeDB will use only the selected items shown above.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </ScreenContainer>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsSelectorOpen(false)}
        visible={isSelectorOpen}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.sectionText}>
                <Text style={styles.modalTitle}>Select Items</Text>
                <Text style={styles.sectionDescription}>
                  Items expiring first are shown first. Use those soon when possible.
                </Text>
              </View>

              <Pressable style={styles.doneButton} onPress={() => setIsSelectorOpen(false)}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.selectAllButton} onPress={handleSelectAllPress}>
                <Text style={styles.selectAllButtonText}>
                  {allAvailableItemsSelected ? 'Clear All' : 'Select All'}
                </Text>
              </Pressable>
              <Text style={styles.modalSelectionCount}>
                {selectedIngredientNames.length} of {availableItems.length} selected
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              {availableItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                const shouldUseSoon = soonExpiringItemIds.includes(item.id);

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                    onPress={() => toggleSelectedItem(item.id)}>
                    <View style={styles.itemText}>
                      <View style={styles.itemNameRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {shouldUseSoon ? <Text style={styles.useSoonBadge}>Use soon</Text> : null}
                      </View>
                      <Text style={styles.itemMeta}>
                        Quantity: {item.quantity} - {formatExpirationMeta(item)}
                      </Text>
                    </View>

                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      <Text style={[styles.checkboxText, isSelected && styles.checkboxTextSelected]}>
                        {isSelected ? '✓' : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    gap: 22,
    paddingBottom: 100,
  },
  header: {
    gap: 8,
    paddingTop: 8,
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
  description: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.mutedText,
  },
  selectionCard: {
    gap: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    color: theme.colors.text,
  },
  sectionDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.mutedText,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primarySurface,
  },
  secondaryButtonText: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  disabledButton: {
    opacity: 0.55,
  },
  stateBlock: {
    gap: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
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
    lineHeight: 20,
    color: theme.colors.mutedText,
  },
  selectedItemsBlock: {
    gap: 8,
  },
  selectedItemsLabel: {
    ...typography.bodySemiBold,
    fontSize: 13,
    color: theme.colors.mutedText,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primarySurface,
  },
  selectedChipText: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.text,
  },
  generateButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  generateButtonText: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.card,
  },
  resultsSection: {
    gap: 12,
  },
  list: {
    gap: 12,
  },
  suggestionCard: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  suggestionTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    color: theme.colors.text,
  },
  suggestionDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.mutedText,
  },
  suggestionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    ...typography.bodyMedium,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    fontSize: 13,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  extraIngredientsText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.mutedText,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalContent: {
    flex: 1,
    gap: 18,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 42,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    ...typography.screenTitle,
    fontSize: 28,
    color: theme.colors.text,
  },
  doneButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  doneButtonText: {
    ...typography.bodySemiBold,
    fontSize: 15,
    color: theme.colors.card,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectAllButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primarySurface,
  },
  selectAllButtonText: {
    ...typography.bodySemiBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
  modalSelectionCount: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    color: theme.colors.mutedText,
    textAlign: 'right',
  },
  modalList: {
    gap: 12,
    paddingBottom: 40,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  itemRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  itemText: {
    flex: 1,
    gap: 4,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemName: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  useSoonBadge: {
    ...typography.bodySemiBold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.warningSurface,
    fontSize: 12,
    color: theme.colors.warning,
  },
  itemMeta: {
    ...typography.body,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  checkbox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  checkboxSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkboxText: {
    ...typography.bodySemiBold,
    fontSize: 16,
    color: theme.colors.card,
  },
  checkboxTextSelected: {
    color: theme.colors.card,
  },
  });
