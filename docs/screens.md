# Screens

## General Navigation

The app uses a fixed bottom menu with the following sections:

- **Home:** main landing screen after login.
- **Fridge:** full inventory of fridge items.
- **Add:** quick access to create a new item.
- **Chef AI:** meal suggestions based on available items.
- **Settings:** profile, preferences, and app information.

## 1. Login

First screen of the application.

### Fields

- User ID.
- Password.

### Actions

- Button to log in.
- Bottom text/link: **Register**.

## 2. Register

Screen used to create a new account.

### Fields

- Email address.
- Unique user ID.
- Password.
- Confirm password.

### Actions

- Button to register.
- Button or link to log in if the user already has an account.

## 3. Home

Main screen after login.

### Header

Must show:

- User name.
- Main text: **This is what is in your fridge**.

### Main Content

Must show a quick fridge summary:

- Total active items in the fridge.
- Items close to expiration. Close to expiration means today through the next 7 days.
- Expired items. Expired means the expiration date is before today.
- List of items recommended to use first, ordered by nearest expiration date.

### Actions

- **Open my fridge** button, which navigates to the **Fridge** screen.
- Tapping **Total items** opens the Fridge screen with all items.
- Tapping **Close to expiration** opens the Fridge screen filtered to non-expired items expiring within 7 days.
- Tapping **Expired items** opens the Fridge screen filtered to expired items.

### Bottom Menu

Includes access to:

- Home.
- Fridge.
- Add.
- Chef AI.
- Settings.

## 4. Fridge

Full inventory screen.

### Header

Must show:

- Total number of items stored in the fridge.

### Filters

Must include filters for:

- All.
- Close to expire.
- Expired.
- Frozen.
- Daily.
- Vegetables.
- Fruits.
- Meat.
- Drinks and liquids.
- Extras.
- Leftovers.

### Item List

Each item must show:

- Representative icon or image.
- Item name.
- Category.
- Quantity.
- Expiration date.
- Edit button.
- Delete button.

Tapping an item opens the item detail/edit screen.

## 5. Edit Item

This screen is used to view and edit an existing item.

### Icon Selection

The user can choose one icon from:

- Milk.
- Cheese.
- Egg.
- Vegetables.
- Meat.
- Glass of juice.
- Fruits.
- Empty container.
- Prepared food.
- Ice cube.

### Fields

- Item name.
- Category.
- Quantity.
- Expiration date.

### Available Categories

- Daily.
- Vegetables.
- Fruits.
- Meat.
- Drink.
- Extras.
- Leftovers.
- Frozen.

### Actions

- **SAVE** button to save changes.

## 6. Add Item

The add item screen uses the same structure as **Edit Item**, but creates a new item in the fridge.

### Fields

- Icon.
- Item name.
- Category.
- Quantity.
- Expiration date.

### Actions

- **SAVE** button to create the new item.

## 7. Chef AI

Screen used to generate meal ideas with selected non-expired fridge items.

### Item Selection

- The screen loads active fridge items.
- Expired items are not shown in the AI item selector.
- Items with expiration dates are ordered by soonest expiration first.
- Undated items are shown after dated items.
- The first soon-expiring dated items are marked **Use soon**.
- The selector includes a **Select All** button.
- If not all selectable items are selected, **Select All** selects every selectable item.
- If all selectable items are selected, the button changes to **Clear All** and clears the selection.
- Individual item selection and unselection must continue working.
- Selected item chips are shown near the **Generate Ideas** action.
- **Generate Ideas** is disabled until at least one item is selected.

### Recipe Generation

- The mobile app sends only selected item names to `POST /recipes/suggest`.
- The mobile app must not call Gemini or any AI provider directly.
- API keys must remain server-side only.
- The backend returns exactly 5 suggestions when Gemini or fallback generation succeeds.

### Suggestion Display

Each suggestion card must show:

- Title.
- Longer practical description.
- Difficulty.
- Estimated time.
- Estimated protein grams.
- Estimated calories.
- Whether the recipe is strict or flexible.
- Extra ingredients when present.

Strict recipes show that they use only selected items. Flexible recipes show extra ingredients, for example **Needs extra ingredients: bread, tomato**.

## 8. Settings

Configuration screen.

### Profile

Must show:

- Circular icon with the first letter of the user ID or nickname.
- User name.
- Email address.

### Notifications

Must include:

- Option to enable or disable a **Daily reminder**.
- The reminder asks whether the user added something new to the fridge.

### About

Must include access to:

- App version.
- Privacy policy.
- Terms of use.
- Feedback.

Each About option redirects to a simple text screen with a button to go back.
