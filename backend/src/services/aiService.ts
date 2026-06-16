import { GoogleGenAI } from "@google/genai";

export type RecipeDifficulty = "easy" | "medium" | "hard";
export type RecipeType = "strict" | "flexible";

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

type GeminiSuggestionResult = {
  rawText: string;
  suggestions: RecipeSuggestion[];
};

class GeminiResponseError extends Error {
  rawText?: string;

  constructor(message: string, rawText?: string) {
    super(message);
    this.name = "GeminiResponseError";
    this.rawText = rawText;
  }
}

const normalizeIngredientList = (ingredients: string[]) =>
  ingredients.map((ingredient) => ingredient.trim()).filter(Boolean);

const formatIngredientList = (ingredients: string[]) => {
  if (ingredients.length === 0) {
    return "your selected ingredients";
  }

  if (ingredients.length === 1) {
    return ingredients[0];
  }

  const head = ingredients.slice(0, -1).join(", ");
  return head + " and " + ingredients[ingredients.length - 1];
};

const createFallbackSuggestions = (ingredients: string[]): RecipeSuggestion[] => {
  const normalizedIngredients = normalizeIngredientList(ingredients);
  const primaryIngredients = normalizedIngredients.slice(0, 3);
  const ingredientText = formatIngredientList(primaryIngredients);
  const mainIngredient = primaryIngredients[0] ?? "your ingredients";

  return [
    {
      title: mainIngredient + " skillet",
      description:
        "A quick skillet meal that keeps the focus on " +
        ingredientText +
        ". Cook the selected ingredients with a little oil or butter, then season with salt and pepper for a simple hot meal.",
      difficulty: "easy",
      estimatedTimeMinutes: 20,
      estimatedProteinGrams: 18,
      estimatedCalories: 280,
      recipeType: "strict",
      usesOnlySelectedItems: true,
      extraIngredients: [],
    },
    {
      title: mainIngredient + " simple saute",
      description:
        "A strict fridge-only idea using " +
        ingredientText +
        " with pantry basics only. It is best when you want a fast meal without adding major ingredients from outside the selected list.",
      difficulty: "medium",
      estimatedTimeMinutes: 18,
      estimatedProteinGrams: 16,
      estimatedCalories: 240,
      recipeType: "strict",
      usesOnlySelectedItems: true,
      extraIngredients: [],
    },
    {
      title: mainIngredient + " bowl",
      description:
        "A flexible bowl using " +
        ingredientText +
        " as the main flavor, with rice added to make it more filling. This works well when you want the selected items to stretch into a complete meal.",
      difficulty: "medium",
      estimatedTimeMinutes: 25,
      estimatedProteinGrams: 20,
      estimatedCalories: 520,
      recipeType: "flexible",
      usesOnlySelectedItems: false,
      extraIngredients: ["rice"],
    },
    {
      title: mainIngredient + " soup",
      description:
        "A warm soup built around " +
        ingredientText +
        " with broth and a few simple aromatics. The extra ingredients make the meal more rounded while still using the selected items as the base.",
      difficulty: "medium",
      estimatedTimeMinutes: 35,
      estimatedProteinGrams: 17,
      estimatedCalories: 360,
      recipeType: "flexible",
      usesOnlySelectedItems: false,
      extraIngredients: ["broth", "onion"],
    },
    {
      title: mainIngredient + " bake",
      description:
        "A baked meal using " +
        ingredientText +
        " with pasta or potatoes for structure. It takes longer than the faster ideas, but gives you a more substantial dish with leftovers potential.",
      difficulty: "hard",
      estimatedTimeMinutes: 40,
      estimatedProteinGrams: 24,
      estimatedCalories: 620,
      recipeType: "flexible",
      usesOnlySelectedItems: false,
      extraIngredients: ["pasta or potatoes"],
    },
  ];
};

const normalizeNumber = (value: unknown, minimum: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(minimum, Math.round(value));
};

const recipeSuggestionSchema = (
  value: unknown,
  expectedRecipeType?: RecipeType,
): RecipeSuggestion | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const suggestion = value as Record<string, unknown>;
  const title = typeof suggestion.title === "string" ? suggestion.title.trim() : "";
  const description = typeof suggestion.description === "string" ? suggestion.description.trim() : "";
  const difficulty = typeof suggestion.difficulty === "string" ? suggestion.difficulty.trim() : "";
  const recipeType = typeof suggestion.recipeType === "string" ? suggestion.recipeType.trim() : "";
  const estimatedTimeMinutes = normalizeNumber(suggestion.estimatedTimeMinutes, 1);
  const estimatedProteinGrams = normalizeNumber(suggestion.estimatedProteinGrams, 0);
  const estimatedCalories = normalizeNumber(suggestion.estimatedCalories, 0);
  const usesOnlySelectedItems = suggestion.usesOnlySelectedItems;
  const extraIngredients = suggestion.extraIngredients;

  if (
    !title ||
    !description ||
    !["easy", "medium", "hard"].includes(difficulty) ||
    !["strict", "flexible"].includes(recipeType) ||
    (expectedRecipeType !== undefined && recipeType !== expectedRecipeType)
  ) {
    return null;
  }

  if (
    estimatedTimeMinutes === null ||
    estimatedProteinGrams === null ||
    estimatedCalories === null ||
    typeof usesOnlySelectedItems !== "boolean" ||
    !Array.isArray(extraIngredients)
  ) {
    return null;
  }

  if (recipeType === "strict" && !usesOnlySelectedItems) {
    return null;
  }

  const normalizedExtraIngredients = extraIngredients
    .filter((ingredient): ingredient is string => typeof ingredient === "string")
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);

  return {
    title,
    description,
    difficulty: difficulty as RecipeDifficulty,
    estimatedTimeMinutes,
    estimatedProteinGrams,
    estimatedCalories,
    recipeType: recipeType as RecipeType,
    usesOnlySelectedItems,
    extraIngredients: recipeType === "strict" ? [] : normalizedExtraIngredients,
  };
};

const sanitizePreview = (text: string, maxLength = 300) =>
  text.replace(/\s+/g, " ").trim().slice(0, maxLength);

const getErrorRecord = (error: unknown): Record<string, unknown> | null =>
  error && typeof error === "object" ? (error as Record<string, unknown>) : null;

const getErrorName = (error: unknown) => {
  if (error instanceof Error) {
    return error.name;
  }

  return typeof error;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
};

const getProviderStatus = (error: unknown) => {
  const errorRecord = getErrorRecord(error);
  const response = getErrorRecord(errorRecord?.response);
  const status = errorRecord?.status ?? errorRecord?.statusCode ?? response?.status;
  const statusText = errorRecord?.statusText ?? response?.statusText;

  return {
    status: typeof status === "number" || typeof status === "string" ? status : undefined,
    statusText: typeof statusText === "string" ? statusText : undefined,
  };
};

const logGeminiFailure = (
  reason: string,
  context: {
    error?: unknown;
    geminiApiKeyConfigured: boolean;
    model: string;
    provider: string | undefined;
    rawText?: string;
    validSuggestionCount?: number;
  },
) => {
  const providerStatus = getProviderStatus(context.error);

  console.error("Gemini recipe suggestion failed; using fallback suggestions.", {
    reason,
    errorName: context.error ? getErrorName(context.error) : undefined,
    errorMessage: context.error ? getErrorMessage(context.error) : undefined,
    provider: context.provider,
    model: context.model,
    geminiApiKeyConfigured: context.geminiApiKeyConfigured,
    status: providerStatus.status,
    statusText: providerStatus.statusText,
    validSuggestionCount: context.validSuggestionCount,
    rawModelTextPreview: context.rawText ? sanitizePreview(context.rawText) : undefined,
  });
};

const parseGeminiSuggestions = (
  text: string,
  fallbackSuggestions: RecipeSuggestion[],
): RecipeSuggestion[] => {
  if (!text.trim()) {
    throw new GeminiResponseError("Gemini returned empty response text", text);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    throw new GeminiResponseError("Gemini returned invalid JSON: " + getErrorMessage(error), text);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new GeminiResponseError("Gemini JSON response was not an object", text);
  }

  const suggestions = (parsed as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) {
    throw new GeminiResponseError("Gemini JSON response did not include a suggestions array", text);
  }

  const validSuggestions = suggestions.slice(0, 5).map((suggestion, index) =>
    recipeSuggestionSchema(suggestion, index < 2 ? "strict" : "flexible"),
  );
  const validSuggestionCount = validSuggestions.filter(Boolean).length;

  if (validSuggestionCount === 0) {
    throw new GeminiResponseError("Gemini returned no valid recipe suggestions", text);
  }

  return fallbackSuggestions.map((fallbackSuggestion, index) => validSuggestions[index] ?? fallbackSuggestion);
};

const buildRecipePrompt = (ingredients: string[]) => {
  const ingredientList = normalizeIngredientList(ingredients);

  return [
    "Generate exactly 5 simple and practical recipe ideas for FridgeDB.",
    "The user selected these fridge items as ingredients:",
    ingredientList.map((ingredient) => "- " + ingredient).join("\n"),
    "",
    "Recipe rules:",
    "1. Return exactly 5 recipes.",
    '2. Recipes 1 and 2 must have recipeType "strict".',
    '3. Strict recipes may use only selected ingredients plus these pantry basics: salt, pepper, water, oil, butter.',
    "4. Strict recipes must not use any major ingredient that was not selected.",
    '5. Recipes 3, 4, and 5 must have recipeType "flexible".',
    "6. Flexible recipes may include external ingredients, but every external ingredient must be listed in extraIngredients.",
    "7. Use varied difficulty values when appropriate. Do not make every recipe easy unless all five genuinely are easy.",
    "8. Protein and calories are estimates only; they do not need to be medically precise.",
    "",
    "Return valid JSON only. Do not use markdown. Do not include extra text.",
    'The JSON shape must be: {"suggestions":[{"title":"string","description":"longer practical description","difficulty":"easy","estimatedTimeMinutes":15,"estimatedProteinGrams":22,"estimatedCalories":320,"recipeType":"strict","usesOnlySelectedItems":true,"extraIngredients":[]}]}',
    'difficulty must be exactly one of: "easy", "medium", "hard".',
    'recipeType must be exactly one of: "strict", "flexible".',
    "estimatedTimeMinutes must be a number.",
    "estimatedProteinGrams must be a number.",
    "estimatedCalories must be a number.",
    "usesOnlySelectedItems must be true for strict recipes and false for flexible recipes that need external ingredients.",
    "extraIngredients must be an array of strings. Use [] for strict recipes.",
  ].join("\n");
};

const fillMissingSuggestions = (
  suggestions: RecipeSuggestion[],
  fallbackSuggestions: RecipeSuggestion[],
) => {
  if (suggestions.length >= 5) {
    return suggestions.slice(0, 5);
  }

  const existingTitles = new Set(suggestions.map((suggestion) => suggestion.title.toLowerCase()));
  const additions = fallbackSuggestions.filter(
    (suggestion) => !existingTitles.has(suggestion.title.toLowerCase()),
  );

  return [...suggestions, ...additions].slice(0, 5);
};

const suggestRecipesWithGemini = async (
  ingredients: string[],
  apiKey: string,
  model: string,
): Promise<GeminiSuggestionResult> => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildRecipePrompt(ingredients),
    config: {
      responseMimeType: "application/json",
    },
  });
  const rawText = response.text ?? "";

  return {
    rawText,
    suggestions: parseGeminiSuggestions(rawText, createFallbackSuggestions(ingredients)),
  };
};

export const suggestRecipesFromIngredients = async (
  ingredients: string[],
): Promise<RecipeSuggestion[]> => {
  const provider = process.env.AI_PROVIDER?.trim();
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim() || "gemini-2.5-flash-lite";
  const fallbackSuggestions = createFallbackSuggestions(ingredients);

  if (provider !== "gemini") {
    logGeminiFailure("provider_not_configured_for_gemini", {
      geminiApiKeyConfigured: Boolean(apiKey),
      model,
      provider,
    });
    return fallbackSuggestions;
  }

  if (!apiKey) {
    logGeminiFailure("missing_gemini_api_key", {
      geminiApiKeyConfigured: false,
      model,
      provider,
    });
    return fallbackSuggestions;
  }

  try {
    const geminiResult = await suggestRecipesWithGemini(ingredients, apiKey, model);

    if (geminiResult.suggestions.length < 5) {
      logGeminiFailure("gemini_returned_fewer_than_five_valid_suggestions", {
        geminiApiKeyConfigured: true,
        model,
        provider,
        rawText: geminiResult.rawText,
        validSuggestionCount: geminiResult.suggestions.length,
      });
    }

    return fillMissingSuggestions(geminiResult.suggestions, fallbackSuggestions);
  } catch (error) {
    logGeminiFailure("gemini_request_or_response_failed", {
      error,
      geminiApiKeyConfigured: true,
      model,
      provider,
      rawText: error instanceof GeminiResponseError ? error.rawText : undefined,
    });
    return fallbackSuggestions;
  }
};
