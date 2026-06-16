export type ProductCategory =
  | 'Daily'
  | 'Vegetables'
  | 'Fruits'
  | 'Meat'
  | 'Drinks'
  | 'Extras'
  | 'Leftovers'
  | 'Frozen';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  quantity: number;
  expiresAt: string;
};

export type FridgeItem = {
  id: number;
  userId: string;
  categoryId: string;
  iconId: string;
  name: string;
  quantity: number;
  expirationDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateFridgeItemInput = {
  userId: string;
  categoryId: string;
  iconId: string;
  name: string;
  quantity: number;
  expirationDate?: string;
};

export type UpdateFridgeItemInput = CreateFridgeItemInput;

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';
export type RecipeType = 'strict' | 'flexible';

export type RecipeSuggestion = {
  title: string;
  description: string;
  difficulty: RecipeDifficulty;
  estimatedTimeMinutes: number;
  estimatedProteinGrams: number;
  estimatedCalories: number;
  recipeType: RecipeType;
  usesOnlySelectedItems: boolean;
  extraIngredients: string[];
};
