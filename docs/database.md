# Database

## Purpose

The FridgeDB database stores the information required to manage fridge items and support planned user accounts, reminders, and Chef AI history. Current AI recipe generation does not persist AI requests or suggestions.

The structure is designed for a relational database, but it could be adapted to a document database later if the project needs it.

## Main Entities

The app needs to store five groups of information:

- Users.
- Items stored in the fridge.
- Item categories.
- User settings.
- Chef AI requests and results, planned for future persistence.

## Logical Diagram

```text
users
  1 --- * fridge_items
  1 --- 1 user_settings
  1 --- * chef_ai_requests

categories
  1 --- * fridge_items

icons
  1 --- * fridge_items

chef_ai_requests
  1 --- * chef_ai_request_items
  1 --- * chef_ai_suggestions
```

## Tables

## users

Stores the main data for each account.

Used by:

- Login.
- Registration.
- Home header.
- Settings profile.

| Field | Type | Description |
| --- | --- | --- |
| id | uuid | Internal user identifier |
| user_id | text | Unique ID chosen by the user |
| email | text | Email address |
| password_hash | text | Hashed password |
| name | text | User display name |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update date |

### Rules

- `user_id` must be unique.
- `email` must be unique.
- The password must never be stored as plain text.
- The profile icon can be calculated from the first letter of `user_id` or `name`, so it does not need a separate database field.

## user_settings

Stores user configuration preferences.

Used by:

- Settings.
- Notifications.

| Field | Type | Description |
| --- | --- | --- |
| id | uuid | Internal identifier |
| user_id | uuid | Reference to `users.id` |
| daily_reminder_enabled | boolean | Indicates whether the daily reminder is enabled |
| daily_reminder_time | time | Optional reminder time |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update date |

### Rules

- Each user must have at most one settings row.
- If `daily_reminder_enabled` is `false`, the app must not trigger the daily reminder.

## categories

Defines the available categories used to classify items.

Used by:

- Fridge filters.
- Add item form.
- Edit item form.

| Field | Type | Description |
| --- | --- | --- |
| id | uuid | Internal identifier |
| key | text | Technical category key |
| name | text | Display name |
| sort_order | integer | Display order |
| is_active | boolean | Indicates whether it is shown in the app |

### Initial Categories

| key | name |
| --- | --- |
| daily | Daily |
| vegetables | Vegetables |
| fruits | Fruits |
| meat | Meat |
| drinks | Drink |
| extras | Extras |
| leftovers | Leftovers |
| frozen | Frozen |

### Rules

- Item category is required.
- Categories are stored in a separate table to avoid duplicated text and make filtering easier.

## icons

Defines the icons the user can select to represent an item.

Used by:

- Add item.
- Edit item.
- Fridge item list.

| Field | Type | Description |
| --- | --- | --- |
| id | uuid | Internal identifier |
| key | text | Technical icon key |
| name | text | Display name |
| asset_name | text | Asset or icon name used by the app |
| sort_order | integer | Display order |
| is_active | boolean | Indicates whether it is shown in the app |

### Initial Icons

| key | name |
| --- | --- |
| milk | Milk |
| cheese | Cheese |
| egg | Egg |
| vegetables | Vegetables |
| meat | Meat |
| juice | Glass of juice |
| fruits | Fruits |
| empty_container | Empty container |
| leftovers | Prepared food |
| ice_cube | Ice cube |

## fridge_items

Stores each item added by the user to their fridge.

Used by:

- Home.
- Fridge.
- Add item.
- Edit item.
- Chef AI.

| Field | Type | Description |
| --- | --- | --- |
| id | uuid | Internal item identifier |
| user_id | uuid | Reference to `users.id` |
| category_id | uuid | Reference to `categories.id` |
| icon_id | uuid | Reference to `icons.id` |
| name | text | Item name |
| quantity | integer | Available quantity |
| expiration_date | date | Expiration date |
| status | text | Item status |
| created_at | timestamp | Creation date |
| updated_at | timestamp | Last update date |
| deleted_at | timestamp | Soft delete date, if applicable |

### Possible Statuses

| Status | Description |
| --- | --- |
| active | Item is visible and available in the fridge |
| deleted | Item was deleted by the user |
| expired | Item is expired, calculated from date or marked by the system |

### Rules

- Home calculates total items using `active` records.
- Items close to expiration are calculated with `expiration_date`.
- The "use first" list is ordered by `expiration_date` ascending.
- Deleting an item can be handled as a soft delete with `deleted_at` and `status = deleted`.
- `quantity` must be greater than zero.

## chef_ai_requests

Stores each request the user makes to Chef AI.

Status: planned. The current MVP calls Gemini through the backend and returns suggestions without storing request history.

Used by future:

- Chef AI screen history.
- Refresh/debug tracking.
- Future internal history or auditing.

| Field | Type | Description |
| --- | --- | --- |
| id | uuid | Internal identifier |
| user_id | uuid | Reference to `users.id` |
| mode | text | `all_items` or `selected_items` |
| prompt | text | Prompt sent to the AI |
| created_at | timestamp | Creation date |

### Rules

- If the user chooses to use the whole fridge, `mode` must be `all_items`.
- If the user chooses items manually, `mode` must be `selected_items`.
- Each time the user taps **Refresh**, a new request is created.

## chef_ai_request_items

Status: planned. Stores which items were used for a persisted Chef AI request.

This would make it possible to know which fridge contents generated the suggestions.

| Field | Type | Description |
| --- | --- | --- |
| id | uuid | Internal identifier |
| request_id | uuid | Reference to `chef_ai_requests.id` |
| fridge_item_id | uuid | Reference to `fridge_items.id` |
| item_name_snapshot | text | Item name at the time of the request |
| quantity_snapshot | integer | Quantity at the time of the request |
| expiration_date_snapshot | date | Expiration date at the time of the request |

### Rules

- Snapshots are stored so the request still makes sense even if the item is edited or deleted later.

## chef_ai_suggestions

Status: planned. Current suggestions are returned directly by `POST /recipes/suggest` and are not persisted.

Stores the meal options returned by the AI for future history features.

Used by future:

- Chef AI result history.

| Field | Type | Description |
| --- | --- | --- |
| id | uuid | Internal identifier |
| request_id | uuid | Reference to `chef_ai_requests.id` |
| title | text | Suggested meal name |
| description | text | Short description |
| steps | text | Short steps or instructions |
| sort_order | integer | Display order |
| created_at | timestamp | Creation date |

### Rules

- Each request should return up to 5 suggestions.
- The order is preserved using `sort_order`.

## Main App Queries

## Home

Home needs to:

- Get user data.
- Count active items.
- Count items close to expiration.
- List active items ordered by nearest expiration date.

Conceptual query:

```text
fridge_items
where user_id = current_user
and status = 'active'
order by expiration_date asc
```

## Fridge

The Fridge screen needs to:

- List active items.
- Filter by category.
- Show icon, name, quantity, and expiration date.

Conceptual query:

```text
fridge_items
join categories
join icons
where user_id = current_user
and status = 'active'
and category_id = selected_category
```

## Add and Edit Item

These screens need to:

- Read active categories.
- Read active icons.
- Create or update a `fridge_items` record.

## Chef AI

Chef AI currently needs to:

- Read active fridge items on mobile.
- Exclude expired items from selection.
- Send selected item names to `POST /recipes/suggest`.
- Receive exactly 5 validated/fallback recipe suggestions.

Future persisted Chef AI history would additionally create rows in `chef_ai_requests`, `chef_ai_request_items`, and `chef_ai_suggestions`.

## Recommended Indexes

- `users.user_id`
- `users.email`
- `fridge_items.user_id`
- `fridge_items.category_id`
- `fridge_items.expiration_date`
- `fridge_items.status`
- `chef_ai_requests.user_id`
- `chef_ai_request_items.request_id`
- `chef_ai_suggestions.request_id`

## Security and Privacy

- Queries must always filter by `user_id`.
- A user must not be able to read or modify another user's items.
- Passwords must be stored as secure hashes.
- Prompts sent to Chef AI must not include unnecessary sensitive information.

## Initial Data

When the database is initialized, it should load:

- Initial categories.
- Initial icons.
- Default settings when a user is created.

## Pending Decisions

- Whether shared fridges between multiple users will exist in the future.
- Whether items will have a unit of measurement in addition to quantity.
- Whether deleted or consumed item history will be stored.
- Whether Chef AI history will be visible to the user.
