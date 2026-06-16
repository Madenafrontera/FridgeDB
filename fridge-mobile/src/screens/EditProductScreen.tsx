import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { routes } from '@/navigation/routes';
import { getFridgeItem, updateFridgeItem } from '@/services/api';
import { refreshFridgeNotifications } from '@/services/notifications';
import { type AppTheme, useAppTheme } from '@/styles/theme';
import { typography } from '@/styles/typography';
import { FridgeItem, ProductCategory } from '@/types/product';

type IconOption = {
  id: string;
  label: string;
  value: string;
};

const iconOptions: IconOption[] = [
  { id: '1', label: 'Milk', value: '🥛' },
  { id: '2', label: 'Cheese', value: '🧀' },
  { id: '3', label: 'Egg', value: '🥚' },
  { id: '4', label: 'Vegetables', value: '🥬' },
  { id: '5', label: 'Meat', value: '🥩' },
  { id: '6', label: 'Glass of juice', value: '🧃' },
  { id: '7', label: 'Fruits', value: '🍎' },
  { id: '8', label: 'Empty container', value: '🥡' },
  { id: '9', label: 'Prepared food', value: '🍱' },
  { id: '10', label: 'Ice cube', value: '🧊' },
];

const categories: ProductCategory[] = [
  'Daily',
  'Vegetables',
  'Fruits',
  'Meat',
  'Drinks',
  'Extras',
  'Leftovers',
  'Frozen',
];

const categoryIds: Record<ProductCategory, string> = {
  Daily: '1',
  Vegetables: '2',
  Fruits: '3',
  Meat: '4',
  Drinks: '5',
  Extras: '6',
  Leftovers: '7',
  Frozen: '8',
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

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
}

function getDateKeyFromApiValue(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function getDateFromApiValue(value: string) {
  if (!isValidDateString(value)) {
    return new Date();
  }

  return new Date(value + 'T00:00:00');
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function parseItemId(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const id = Number(rawValue);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function getIconOption(iconId: string) {
  return iconOptions.find((icon) => icon.id === iconId) ?? iconOptions[0];
}

function getItemCategory(categoryId: string) {
  return categoryIdToCategory[categoryId] ?? 'Extras';
}

export function EditProductScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ id?: string }>();
  const itemId = parseItemId(params.id);
  const [item, setItem] = useState<FridgeItem | null>(null);
  const [selectedIcon, setSelectedIcon] = useState(iconOptions[0]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Daily');
  const [quantity, setQuantity] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadItem() {
      if (!itemId) {
        setErrorMessage('Invalid item id.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const fridgeItem = await getFridgeItem(itemId);

        if (!isMounted) {
          return;
        }

        setItem(fridgeItem);
        setSelectedIcon(getIconOption(fridgeItem.iconId));
        setName(fridgeItem.name);
        setCategory(getItemCategory(fridgeItem.categoryId));
        setQuantity(fridgeItem.quantity);
        setExpiresAt(getDateKeyFromApiValue(fridgeItem.expirationDate));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load item');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadItem();

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  function decreaseQuantity() {
    setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1));
  }

  function handleBackPress() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(routes.inventory);
  }

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === 'dismissed') {
      setIsDatePickerVisible(false);
      return;
    }

    if (selectedDate) {
      setExpiresAt(formatDateForApi(selectedDate));
    }

    setIsDatePickerVisible(false);
  }

  async function saveChanges() {
    if (!itemId || !item) {
      Alert.alert('Could not save item', 'The item was not loaded correctly.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedExpirationDate = expiresAt.trim();

    if (!trimmedName) {
      Alert.alert('Missing item name', 'Add a product name before saving changes.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert('Invalid quantity', 'Quantity must be greater than 0.');
      return;
    }

    if (trimmedExpirationDate && !isValidDateString(trimmedExpirationDate)) {
      Alert.alert('Invalid expiration date', 'Use a valid date in YYYY-MM-DD format.');
      return;
    }

    try {
      setIsSaving(true);

      await updateFridgeItem(itemId, {
        userId: item.userId,
        categoryId: categoryIds[category] ?? '2',
        iconId: selectedIcon.id,
        name: trimmedName,
        quantity,
        ...(trimmedExpirationDate ? { expirationDate: trimmedExpirationDate } : {}),
      });
      await refreshFridgeNotifications();

      router.replace(routes.inventory);
    } catch (error) {
      Alert.alert(
        'Could not save item',
        error instanceof Error ? error.message : 'Check that the backend is running and try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Product</Text>
          <Text style={styles.eyebrow}>Fridge item</Text>
          <Text style={styles.description}>Update the item details and save your changes.</Text>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Loading item</Text>
            <Text style={styles.stateText}>Checking your fridge inventory.</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Could not load item</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Icon</Text>
              <View style={styles.iconGrid}>
                {iconOptions.map((icon) => {
                  const isSelected = selectedIcon.id === icon.id;

                  return (
                    <Pressable
                      key={icon.id}
                      style={[styles.iconButton, isSelected && styles.iconButtonSelected]}
                      onPress={() => setSelectedIcon(icon)}>
                      <Text style={styles.iconValue}>{icon.value}</Text>
                      <Text style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}>
                        {icon.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Item name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Example: Milk"
                placeholderTextColor={theme.colors.mutedText}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((itemCategory) => {
                  const isSelected = category === itemCategory;

                  return (
                    <Pressable
                      key={itemCategory}
                      style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
                      onPress={() => setCategory(itemCategory)}>
                      <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                        {itemCategory === 'Drinks' ? 'Drink' : itemCategory}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.quantityRow}>
                <Pressable style={styles.quantityButton} onPress={decreaseQuantity}>
                  <Text style={styles.quantityButtonText}>-</Text>
                </Pressable>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <Pressable
                  style={styles.quantityButton}
                  onPress={() => setQuantity((currentQuantity) => currentQuantity + 1)}>
                  <Text style={styles.quantityButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expiration date</Text>
              <View style={styles.dateRow}>
                <Pressable style={styles.dateButton} onPress={() => setIsDatePickerVisible(true)}>
                  <Text style={[styles.dateButtonText, !expiresAt && styles.datePlaceholder]}>
                    {expiresAt || 'Select date'}
                  </Text>
                </Pressable>
              </View>

              {isDatePickerVisible ? (
                <DateTimePicker
                  mode="date"
                  value={getDateFromApiValue(expiresAt)}
                  display="default"
                  onChange={handleDateChange}
                />
              ) : null}
            </View>

            <Pressable
              disabled={isSaving}
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              onPress={saveChanges}>
              <Text style={styles.submitButtonText}>{isSaving ? 'SAVING...' : 'SAVE'}</Text>
            </Pressable>
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={12}
        style={({ pressed }) => [
          styles.floatingBackButton,
          pressed && styles.floatingBackButtonPressed,
        ]}
        onPress={handleBackPress}>
        <Text style={styles.backButtonText}>‹</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    gap: 24,
    paddingTop: 30,
    paddingBottom: 10,
  },
  header: {
    gap: 10,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 54,
    left: 24,
    zIndex: 10,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 23,
    backgroundColor: theme.colors.card,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  floatingBackButtonPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: theme.colors.primarySurface,
  },
  backButtonText: {
    ...typography.sectionTitle,
    marginTop: -4,
    fontSize: 34,
    color: theme.colors.text,
  },
  eyebrow: {
    ...typography.bodySemiBold,
    fontSize: 15,
    color: theme.colors.primary,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 38,
    color: theme.colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 23,
    color: theme.colors.mutedText,
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
  section: {
    gap: 12,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    color: theme.colors.text,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: '31%',
    minWidth: 96,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: 'transparent',
  },
  iconButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  iconValue: {
    fontSize: 28,
  },
  iconLabel: {
    ...typography.bodyMedium,
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.mutedText,
  },
  iconLabelSelected: {
    color: theme.colors.text,
  },
  input: {
    ...typography.body,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.card,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  categoryButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  categoryText: {
    ...typography.bodyMedium,
    fontSize: 14,
    color: theme.colors.mutedText,
  },
  categoryTextSelected: {
    color: theme.colors.text,
  },
  quantityRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    padding: 8,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
  },
  quantityButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  quantityButtonText: {
    ...typography.sectionTitle,
    fontSize: 22,
    color: theme.colors.primary,
  },
  quantityValue: {
    ...typography.screenTitle,
    minWidth: 24,
    textAlign: 'center',
    fontSize: 22,
    color: theme.colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.card,
  },
  dateButtonText: {
    ...typography.body,
    fontSize: 16,
    color: theme.colors.text,
  },
  datePlaceholder: {
    color: theme.colors.mutedText,
  },
  submitButton: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...typography.screenTitle,
    fontSize: 18,
    color: theme.colors.card,
  },
  });
