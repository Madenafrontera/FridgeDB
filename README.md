# FridgeDB

FridgeDB is a self-hosted mobile fridge inventory system built with React Native, Expo, Node.js, Express, PostgreSQL, Docker and AI-powered meal suggestions.

The project is designed as a personal-use application for tracking fridge items, expiration dates, reminders and recipe ideas based on selected ingredients.

## Overview

FridgeDB helps users keep track of what they have in their fridge.

Main features include:

* Fridge inventory management
* Add, edit and delete fridge items
* Category and icon selection
* Expiration date tracking
* Home dashboard with fridge status
* Expired and close-to-expiration item detection
* Daily reminder notifications
* Expiring item alerts
* Weekly fridge status reminders
* AI-powered meal suggestions using selected fridge items
* Dark mode support
* Self-hosted backend and database

## Tech Stack

### Mobile App

* React Native
* Expo
* TypeScript
* Expo Notifications
* Dark mode theme system

### Backend

* Node.js
* Express
* TypeScript
* Prisma
* PostgreSQL
* Zod validation
* Gemini API integration

### Infrastructure

* Docker
* Docker Compose
* PostgreSQL container
* Self-hosted deployment target

## Architecture

```text
React Native / Expo Mobile App
        |
        v
Node.js / Express API
        |
        v
PostgreSQL
```

AI meal suggestions are handled through the backend.

```text
Mobile App
        |
        v
POST /recipes/suggest
        |
        v
Backend API
        |
        v
Gemini API
```

The Gemini API key is stored only in the backend environment and is never exposed to the mobile app.

## Current Project Structure

```text
FridgeDB_Project/
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── package.json
│   └── .env.example
│
├── fridge-mobile/
│   ├── src/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   └── constants/
│   ├── package.json
│   └── .env.example
│
├── infrastructure/
│   └── docker-compose.yml
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   └── screens.md
│
├── PRIVACY_POLICY.md
├── TERMS_OF_USE.md
└── README.md
```

## Features

### Inventory Management

FridgeDB allows users to:

* Add fridge items
* Edit item name, category, icon, quantity and expiration date
* Delete items using soft delete
* View all active fridge items
* Filter items by category
* Filter items close to expiration

### Home Dashboard

The home screen displays:

* Total active items
* Items close to expiration
* Expired items
* “Use First” section ordered by nearest expiration date

### Notifications

FridgeDB supports local notifications for:

* Daily reminder to check if new items were added
* Daily alerts for expired or close-to-expiration items
* Weekly fridge status reminder

Notifications are local to the device.

### AI Meal Suggestions

The AI Suggestions screen allows users to:

* Select specific fridge items
* Select all available items
* Generate meal ideas using selected ingredients
* View recipe descriptions
* See estimated cooking time
* See estimated protein and carbohydrate values
* Distinguish between strict recipes and flexible recipes

The first recipe suggestions can be generated using only selected items, while other suggestions may include extra ingredients.

## Requirements

### Development Machine

* Node.js
* npm
* Docker
* Docker Compose
* Expo Go on a mobile device

### Optional

* Git
* VS Code
* A Gemini API key for real AI meal suggestions

## Environment Variables

### Backend

Create a backend environment file:

```bash
cp backend/.env.example backend/.env
```

Example:

```env
PORT=3000
DATABASE_URL=postgresql://fridgedb:fridgedb_dev_password@localhost:5432/fridgedb?schema=public

AI_PROVIDER=gemini
GEMINI_API_KEY=
AI_MODEL=gemini-2.5-flash-lite
```

Do not commit `backend/.env`.

### Mobile App

Create a mobile environment file:

```bash
cp fridge-mobile/.env.example fridge-mobile/.env.local
```

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000
```

When running on a real phone, do not use `localhost`.

Use your development machine’s LAN IP address.

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3000
```

Do not commit `fridge-mobile/.env.local`.

## Running the Project Locally

### 1. Start PostgreSQL

```bash
cd infrastructure
docker compose up -d
```

Check status:

```bash
docker ps
```

### 2. Run Backend

```bash
cd backend
npm install
npm run dev
```

Test health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "fridgedb-api"
}
```

### 3. Run Mobile App

```bash
cd fridge-mobile
npm install
npx expo start -c
```

Scan the QR code with Expo Go.

## API Endpoints

### Health

```http
GET /health
```

### Version

```http
GET /version
```

### Fridge Items

```http
GET /fridge-items
POST /fridge-items
GET /fridge-items/:id
PUT /fridge-items/:id
DELETE /fridge-items/:id
```

### AI Suggestions

```http
POST /recipes/suggest
```

Example request:

```json
{
  "ingredients": ["Milk", "Eggs", "Cheese"]
}
```

Example response:

```json
{
  "suggestions": [
    {
      "title": "Cheese omelette",
      "description": "A practical meal idea using the selected ingredients.",
      "difficulty": "easy",
      "estimatedTimeMinutes": 15,
      "estimatedProteinGrams": 22,
      "estimatedCarbsGrams": 8,
      "recipeType": "strict",
      "usesOnlySelectedItems": true,
      "extraIngredients": []
    }
  ]
}
```

## Database

FridgeDB uses PostgreSQL with Prisma.

Run migrations from the backend folder:

```bash
cd backend
npx prisma migrate dev
```

Open Prisma Studio:

```bash
npx prisma studio
```

## Security Notes

Do not commit secrets.

The following files should stay local:

```text
backend/.env
fridge-mobile/.env
fridge-mobile/.env.local
docs/apikey.txt
```

The Gemini API key must only exist in the backend environment.

Never place AI provider keys in Expo public variables.

## Self-Hosting Notes

FridgeDB is intended to be self-hosted.

Users are responsible for:

* Securing their server
* Managing environment variables
* Protecting API keys
* Managing backups
* Restricting network access
* Keeping the deployment updated

A future production-style setup may include:

* Nginx reverse proxy
* Prometheus metrics
* Grafana dashboards
* Backup and restore scripts
* Healthcheck scripts
* Deployment scripts

## Privacy

FridgeDB does not currently use analytics, tracking, ads or crash reporting tools.

Only selected ingredient names are sent to the configured AI provider when using the AI meal suggestion feature.

See `PRIVACY_POLICY.md` for more information.

## Terms of Use

See `TERMS_OF_USE.md`.

## Project Status

FridgeDB is currently an MVP/personal-use project.

Implemented:

* Mobile inventory UI
* Backend API
* PostgreSQL persistence
* Prisma schema and migrations
* CRUD operations
* Zod validation
* Notifications
* Dark mode
* Gemini-powered recipe suggestions

Planned:

* Platform Engineering improvements
* Full Docker Compose stack
* Nginx reverse proxy
* Backup and restore scripts
* Prometheus and Grafana
* Homeserver deployment
* Optional authentication in the future

## License

No license has been selected yet.

If you plan to reuse, modify or distribute this project, check the repository license once one is added.

## Contact

For questions, issues or requests, use the GitHub repository issue tracker or discussion channels if enabled.
