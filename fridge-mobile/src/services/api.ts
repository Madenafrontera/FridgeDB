import {
  CreateFridgeItemInput,
  FridgeItem,
  RecipeSuggestion,
  UpdateFridgeItemInput,
} from '@/types/product';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type ApiHealth = {
  status: string;
  service: string;
};

export type ApiVersion = {
  name: string;
  version: string;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};

type SuggestRecipesResponse = {
  suggestions: RecipeSuggestion[];
};

export class ApiError extends Error {
  code?: string;
  fields?: Record<string, string>;
  status: number;

  constructor(message: string, status: number, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
  }

  return API_BASE_URL.replace(/\/$/, '');
}

function formatFieldErrors(fields: Record<string, string>) {
  return Object.entries(fields)
    .map(([field, message]) => field + ': ' + message)
    .join('\n');
}

function isRecipeSuggestion(value: unknown): value is RecipeSuggestion {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const suggestion = value as Record<string, unknown>;

  return (
    typeof suggestion.title === 'string' &&
    typeof suggestion.description === 'string' &&
    ['easy', 'medium', 'hard'].includes(String(suggestion.difficulty)) &&
    typeof suggestion.estimatedTimeMinutes === 'number' &&
    typeof suggestion.estimatedProteinGrams === 'number' &&
    typeof suggestion.estimatedCalories === 'number' &&
    ['strict', 'flexible'].includes(String(suggestion.recipeType)) &&
    typeof suggestion.usesOnlySelectedItems === 'boolean' &&
    Array.isArray(suggestion.extraIngredients) &&
    suggestion.extraIngredients.every((ingredient) => typeof ingredient === 'string')
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(getApiBaseUrl() + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = 'Request failed with status ' + response.status;
    let code: string | undefined;
    let fields: Record<string, string> | undefined;

    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body?.error?.message) {
        message = body.error.message;
      }
      code = body?.error?.code;
      fields = body?.error?.fields;
    } catch {
      // Keep the HTTP status message if the response is not JSON.
    }

    if (fields && Object.keys(fields).length > 0) {
      message = message + '\n' + formatFieldErrors(fields);
    }

    throw new ApiError(message, response.status, code, fields);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getFridgeItems() {
  return request<FridgeItem[]>('/fridge-items');
}

export function getHealth() {
  return request<ApiHealth>('/health');
}

export function getVersion() {
  return request<ApiVersion>('/version');
}

export function getFridgeItem(id: number) {
  return request<FridgeItem>('/fridge-items/' + id);
}

export function createFridgeItem(input: CreateFridgeItemInput) {
  return request<FridgeItem>('/fridge-items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateFridgeItem(id: number, input: UpdateFridgeItemInput) {
  return request<FridgeItem>('/fridge-items/' + id, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteFridgeItem(id: number) {
  return request<void>('/fridge-items/' + id, {
    method: 'DELETE',
  });
}

export async function suggestRecipes(ingredients: string[]) {
  const response = await request<SuggestRecipesResponse>('/recipes/suggest', {
    method: 'POST',
    body: JSON.stringify({ ingredients }),
  });

  if (!Array.isArray(response.suggestions)) {
    throw new Error('Could not load suggestions');
  }

  const suggestions = response.suggestions.filter(isRecipeSuggestion);

  if (suggestions.length === 0) {
    throw new Error('Could not load suggestions');
  }

  return suggestions;
}
