# API

## Purpose

The FridgeDB API connects the mobile app with the database. The current MVP manages fridge items, exposes health/version checks, and generates recipe suggestions with Chef AI. Auth, settings, and some catalog endpoints are planned for later.

## General Conventions

- Current local API base path: `/`
- Data format: JSON
- Authentication: planned, not currently enforced by the MVP backend
- Dates: `YYYY-MM-DD`
- Timestamps: ISO 8601
- Future private routes must validate the authenticated user. Current MVP routes use explicit item/user fields where needed.

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request has invalid fields",
    "details": {}
  }
}
```

## Common Error Codes

| Code | Usage |
| --- | --- |
| `VALIDATION_ERROR` | Missing fields or invalid data |
| `UNAUTHORIZED` | The user is not logged in or the token is invalid |
| `FORBIDDEN` | The user is trying to access data they do not own |
| `NOT_FOUND` | The resource does not exist |
| `CONFLICT` | The email or user ID already exists |
| `INTERNAL_ERROR` | Unexpected server error |

## Auth

Status: planned. Auth routes are documented for future implementation and are not currently active in the MVP backend.

## POST `/auth/register`

Creates a new account.

### Body

```json
{
  "email": "user@example.com",
  "user_id": "fridge_user",
  "name": "Fridge User",
  "password": "password123",
  "confirm_password": "password123"
}
```

### Response `201`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_id": "fridge_user",
    "name": "Fridge User"
  },
  "token": "jwt-token"
}
```

### Rules

- `email` must be unique.
- `user_id` must be unique.
- `password` and `confirm_password` must match.
- When the user is created, their default settings must also be created.

## POST `/auth/login`

Logs in with user ID and password.

### Body

```json
{
  "user_id": "fridge_user",
  "password": "password123"
}
```

### Response `200`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_id": "fridge_user",
    "name": "Fridge User"
  },
  "token": "jwt-token"
}
```

## POST `/auth/logout`

Logs out of the current session.

### Response `204`

No content.

## User

Status: planned.

## GET `/me`

Returns the authenticated user's data.

### Response `200`

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "user_id": "fridge_user",
  "name": "Fridge User",
  "profile_initial": "F"
}
```

## Home

The current mobile Home screen does not call a dedicated `/home` endpoint. It loads active fridge items with `GET /fridge-items` and derives the summary on the client.

### Current Home Summary Rules

- `Total items` counts active fridge items returned by `GET /fridge-items`.
- `Close to expiration` counts active items with `expirationDate` from today through the next 7 days. Expired items are not included in this count.
- `Expired items` counts active items with `expirationDate` before today.
- `Use first` lists active items with expiration dates ordered by nearest expiration date first.
- Tapping `Total items` opens Inventory with the `All` filter.
- Tapping `Close to expiration` opens Inventory with the close-to-expiration filter.
- Tapping `Expired items` opens Inventory with the expired filter.

### Planned Dedicated Endpoint

A future `/home` endpoint may return the same summary from the backend, but it is not required by the current MVP implementation.

## Fridge Items

## GET `/fridge-items`

Lists active fridge items.

### Current Response `200`

The current backend returns an array, not a wrapped `{ "items": [] }` object.

```json
[
  {
    "id": 1,
    "userId": "1111",
    "categoryId": "1",
    "iconId": "1",
    "name": "Milk",
    "quantity": 1,
    "expirationDate": "2026-06-02T00:00:00.000Z",
    "status": "active",
    "createdAt": "2026-06-01T12:00:00.000Z",
    "updatedAt": "2026-06-01T12:00:00.000Z",
    "deletedAt": null
  }
]
```

### Current Client-Side Filters

- Inventory `All`: all returned active items.
- Inventory `Close to expire`: items with `expirationDate` from today through the next 7 days.
- Inventory `Expired`: items with `expirationDate` before today.
- Inventory category filters: mapped from `categoryId`.

## GET `/fridge-items/{itemId}`

Returns item details.

### Response `200`

```json
{
  "id": 1,
  "userId": "1111",
  "categoryId": "1",
  "iconId": "1",
  "name": "Milk",
  "quantity": 1,
  "expirationDate": "2026-06-02T00:00:00.000Z",
  "status": "active",
  "createdAt": "2026-06-01T12:00:00.000Z",
  "updatedAt": "2026-06-01T12:00:00.000Z",
  "deletedAt": null
}
```

## POST `/fridge-items`

Creates a new fridge item.

### Body

```json
{
  "userId": "1111",
  "categoryId": "1",
  "iconId": "1",
  "name": "Milk",
  "quantity": 1,
  "expirationDate": "2026-06-02"
}
```

### Response `201`

```json
{
  "id": 1,
  "userId": "1111",
  "categoryId": "1",
  "iconId": "1",
  "name": "Milk",
  "quantity": 1,
  "expirationDate": "2026-06-02T00:00:00.000Z",
  "status": "active",
  "createdAt": "2026-06-01T12:00:00.000Z",
  "updatedAt": "2026-06-01T12:00:00.000Z",
  "deletedAt": null
}
```

### Rules

- `name` is required.
- `quantity` must be greater than zero.
- `userId`, `categoryId`, `iconId`, `name`, and `quantity` are required.
- `quantity` must be a positive integer.
- `expirationDate` is optional and must use `YYYY-MM-DD` when sent.
- Current MVP uses explicit `userId`; authenticated ownership is planned later.

## PUT `/fridge-items/{itemId}`

Edits an existing item.

### Body

All fields are optional, but at least one must be sent.

```json
{
  "name": "Skim milk",
  "quantity": 2,
  "expirationDate": "2026-06-05",
  "categoryId": "1",
  "iconId": "1"
}
```

### Response `200`

```json
{
  "id": 1,
  "userId": "1111",
  "categoryId": "1",
  "iconId": "1",
  "name": "Skim milk",
  "quantity": 2,
  "expirationDate": "2026-06-05T00:00:00.000Z",
  "status": "active",
  "createdAt": "2026-06-01T12:00:00.000Z",
  "updatedAt": "2026-06-02T12:00:00.000Z",
  "deletedAt": null
}
```

### Rules

- At least one field must be sent.
- Items with `status = deleted` cannot be edited.
- Authenticated ownership validation is planned later.

## DELETE `/fridge-items/{itemId}`

Deletes an item from the fridge.

### Response `204`

No content.

### Rules

- The recommended delete strategy is a soft delete: `status = deleted` and `deleted_at` with the current date.
- The user can only delete their own items.

## Categories

Status: planned endpoint. Current mobile category choices are local/static.

## GET `/categories`

Lists active categories.

### Response `200`

```json
{
  "categories": [
    {
      "id": "uuid",
      "key": "daily",
      "name": "Daily",
      "sort_order": 1
    },
    {
      "id": "uuid",
      "key": "frozen",
      "name": "Frozen",
      "sort_order": 8
    }
  ]
}
```

## Icons

Status: planned endpoint. Current mobile icon choices are local/static.

## GET `/icons`

Lists the available item icons.

### Response `200`

```json
{
  "icons": [
    {
      "id": "uuid",
      "key": "milk",
      "name": "Milk",
      "asset_name": "milk",
      "sort_order": 1
    },
    {
      "id": "uuid",
      "key": "ice_cube",
      "name": "Ice cube",
      "asset_name": "ice_cube",
      "sort_order": 10
    }
  ]
}
```

## Recipes

## POST `/recipes/suggest`

Generates 5 AI recipe suggestions from the selected fridge item names.

### Body

```json
{
  "ingredients": ["egg", "cheese", "spinach"]
}
```

### Response `200`

```json
{
  "suggestions": [
    {
      "title": "Cheese omelette",
      "description": "A longer practical description explaining what the meal is, how it uses the selected ingredients, and what to expect from it.",
      "difficulty": "easy",
      "estimatedTimeMinutes": 15,
      "estimatedProteinGrams": 22,
      "estimatedCalories": 320,
      "recipeType": "strict",
      "usesOnlySelectedItems": true,
      "extraIngredients": []
    },
    {
      "title": "Egg sandwich",
      "description": "A longer practical description explaining the meal and the external ingredients needed.",
      "difficulty": "easy",
      "estimatedTimeMinutes": 15,
      "estimatedProteinGrams": 18,
      "estimatedCalories": 430,
      "recipeType": "flexible",
      "usesOnlySelectedItems": false,
      "extraIngredients": ["bread"]
    }
  ]
}
```

### Rules

- `ingredients` must contain 1 to 20 selected fridge item names.
- The API returns exactly 5 suggestions when Gemini or fallback generation succeeds.
- The first 2 suggestions are `strict` recipes that use only selected ingredients plus pantry basics: salt, pepper, water, oil, and butter.
- The last 3 suggestions are `flexible` recipes and may include external ingredients.
- Flexible recipes must list external ingredients in `extraIngredients`.
- `difficulty` is `easy`, `medium`, or `hard`.
- `recipeType` is `strict` or `flexible`.
- Protein and calorie values are estimates only.
- Gemini API keys are server-side only and must not be exposed to the mobile app.

## Legacy / Planned Chef AI History

The current implemented AI endpoint is `POST /recipes/suggest`. The endpoints below describe a possible future persisted AI request history and are not implemented in the MVP backend.

## POST `/chef-ai/suggestions`

Planned endpoint for generating and storing meal options using all items or a manual selection.

### Body Using All Items

```json
{
  "mode": "all_items"
}
```

### Body Using Selected Items

```json
{
  "mode": "selected_items",
  "item_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### Response `201`

```json
{
  "request_id": "uuid",
  "mode": "selected_items",
  "suggestions": [
    {
      "id": "uuid",
      "title": "Vegetable omelette",
      "description": "A quick meal using eggs and vegetables.",
      "steps": "Beat the eggs, cut the vegetables, and cook everything in a pan.",
      "sort_order": 1
    }
  ]
}
```

### Rules

- The response must include up to 5 suggestions.
- If `mode = all_items`, the API uses all active items owned by the user.
- If `mode = selected_items`, `item_ids` is required.
- Submitted items must belong to the authenticated user.
- The **Refresh** button calls this endpoint again.

## GET `/chef-ai/requests/{requestId}`

Returns a previous Chef AI request with its suggestions.

### Response `200`

```json
{
  "id": "uuid",
  "mode": "all_items",
  "created_at": "2026-05-27T10:00:00Z",
  "items": [
    {
      "fridge_item_id": "uuid",
      "name": "Milk",
      "quantity": 1,
      "expiration_date": "2026-06-02"
    }
  ],
  "suggestions": [
    {
      "id": "uuid",
      "title": "Simple smoothie",
      "description": "A quick drink with milk and fruit.",
      "steps": "Blend the ingredients and serve cold.",
      "sort_order": 1
    }
  ]
}
```

## Settings

Status: planned backend endpoints. Current mobile settings are local UI/storage where implemented.

## GET `/settings`

Returns the user's settings.

### Response `200`

```json
{
  "daily_reminder_enabled": true,
  "daily_reminder_time": "20:00"
}
```

## PATCH `/settings`

Updates the user's settings.

### Body

```json
{
  "daily_reminder_enabled": true,
  "daily_reminder_time": "20:00"
}
```

### Response `200`

```json
{
  "daily_reminder_enabled": true,
  "daily_reminder_time": "20:00"
}
```

### Rules

- If `daily_reminder_enabled` is `false`, `daily_reminder_time` may be `null`.

## About

Status: planned backend endpoints. Current About screens are mobile-side.

## GET `/about`

Returns basic app information for the About screen.

### Response `200`

```json
{
  "version": "1.0.0",
  "privacy_policy_url": "/legal/privacy",
  "terms_url": "/legal/terms",
  "feedback_url": "/feedback"
}
```

## GET `/legal/privacy`

Returns the privacy policy text.

### Response `200`

```json
{
  "title": "Privacy Policy",
  "content": "Privacy policy text."
}
```

## GET `/legal/terms`

Returns the terms of use text.

### Response `200`

```json
{
  "title": "Terms of Use",
  "content": "Terms of use text."
}
```

## POST `/feedback`

Sends user feedback.

### Body

```json
{
  "message": "I would like to add photos to items."
}
```

### Response `201`

```json
{
  "id": "uuid",
  "message": "Feedback received"
}
```

## Endpoints By Screen

| Screen | Endpoints |
| --- | --- |
| Login | Planned |
| Register | Planned |
| Home | `GET /fridge-items` |
| Fridge | `GET /fridge-items` |
| Add item | `POST /fridge-items` |
| Edit item | `GET /fridge-items/{itemId}`, `PUT /fridge-items/{itemId}` |
| Delete item | `DELETE /fridge-items/{itemId}` |
| Chef AI | `GET /fridge-items`, `POST /recipes/suggest` |
| Settings | `GET /health`, `GET /version`, local settings storage |
