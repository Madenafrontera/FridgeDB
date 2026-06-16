# Architecture

## 1. System Purpose

FridgeDB is a cross-platform mobile application for Android and iPhone. It helps users manage the inventory of their refrigerator, track expiration dates, review their inventory weekly, receive daily reminders, and get AI meal suggestions based on available ingredients.

The project is designed as a practical mobile app backed by a REST API and a PostgreSQL database. The architecture should stay simple for the MVP, while leaving clear paths for production operations, monitoring, backups, and future AI integration.

## 2. High-Level Architecture

```text
Mobile App
React Native + Expo + TypeScript
        |
        | HTTPS / REST API
        v
Backend API
Node.js + Express + TypeScript
        |
        | Prisma ORM
        v
Database
PostgreSQL
```

Planned production-facing architecture:

```text
User Device
Android / iPhone
        |
        | HTTPS
        v
Nginx
Reverse proxy / TLS / routing
        |
        v
Express API
Node.js service
        |
        v
PostgreSQL
Persistent relational data

Monitoring Stack
Prometheus -> Grafana
```

## 3. Component Responsibilities

## Mobile App

Technology: React Native, Expo, TypeScript.

Responsibilities:

- Display login, registration, home, fridge inventory, item editor, Chef AI, and settings screens.
- Call the REST API for user data, inventory data, settings, and AI suggestions.
- Handle client-side form validation before sending requests.
- Show daily reminder UI and notification-related settings.
- Keep mobile-specific behavior inside the app layer.

Planned:

- Push or local notifications for daily reminders.
- Weekly inventory review flow.
- AI meal suggestions UI connected to the backend through `POST /recipes/suggest`.

## Backend API

Technology: Node.js, Express, TypeScript.

Responsibilities:

- Expose REST endpoints for authentication, fridge items, categories, icons, settings, and Chef AI requests.
- Validate input from the mobile app.
- Enforce authorization so users only access their own data.
- Coordinate database access through Prisma.
- Provide health check endpoints for operations.

Planned:

- AI provider integration through a backend-only service. Gemini is currently used when configured, with fallback suggestions when unavailable.
- Metrics endpoint for Prometheus.
- Background or scheduled jobs for reminders and weekly review support.

## Database

Technology: PostgreSQL.

Responsibilities:

- Persist users, settings, categories, icons, fridge items, AI requests, and AI suggestions.
- Keep relationships consistent between users and their data.
- Support queries for Home, Fridge, item editing, settings, and Chef AI.

The current database structure is documented in [database.md](/home/linux00/Documents/FridgeDB_Project/docs/database.md).

## ORM Layer

Technology: Prisma.

Responsibilities:

- Define the application data model.
- Run database migrations.
- Provide typed database access from the Node.js backend.
- Reduce direct SQL usage in normal application code.

## Reverse Proxy

Technology: Nginx.

Responsibilities:

- Planned for production or production-like environments.
- Terminate TLS when deployed with HTTPS.
- Route public traffic to the backend API.
- Provide a stable public entrypoint in front of the Node.js service.

## Monitoring

Technology: Prometheus and Grafana.

Responsibilities:

- Prometheus collects service and infrastructure metrics.
- Grafana displays dashboards for API health, resource usage, and database status.

Planned:

- API metrics endpoint.
- Basic dashboards for request count, error rate, latency, CPU, memory, and database health.

## Scripts

Technology: Bash scripts.

Responsibilities:

- Provide repeatable commands for setup, development, backups, restore, migrations, and operational checks.
- Keep common admin tasks documented and easy to run.

Planned:

- `dev` startup script.
- Backup script for PostgreSQL.
- Restore script for PostgreSQL.
- Health check script.

## 4. Request Flows

## View Products

```text
User opens Fridge screen
        |
Mobile app calls GET /fridge-items
        |
Express validates auth token
        |
Express queries PostgreSQL through Prisma
        |
API returns active fridge items
        |
Mobile app renders item list and filters
```

Notes:

- The API should only return items owned by the authenticated user.
- Category filtering can be handled through query parameters.

## Add Product

```text
User opens Agregar screen
        |
Mobile app loads categories and icons
        |
User completes product form
        |
Mobile app calls POST /fridge-items
        |
Express validates request body and auth token
        |
Prisma creates fridge item in PostgreSQL
        |
API returns created item
        |
Mobile app updates inventory view
```

Notes:

- Required fields include item name, quantity, category, icon, and expiration date.
- Quantity must be greater than zero.

## Edit Product

```text
User opens an existing item
        |
Mobile app calls GET /fridge-items/{itemId}
        |
User edits item details
        |
Mobile app calls PUT /fridge-items/{itemId}
        |
Express validates ownership and input
        |
Prisma updates the item
        |
API returns updated item
        |
Mobile app refreshes the item details/list
```

Notes:

- Deleted items should not be editable.
- The backend must verify that the item belongs to the authenticated user.

## Weekly Inventory Review

Status: planned.

```text
User starts weekly review
        |
Mobile app requests current active inventory
        |
API returns items grouped or sorted for review
        |
User confirms, edits, or deletes outdated items
        |
Mobile app sends update/delete requests
        |
Backend persists changes through Prisma
        |
Mobile app shows review completion state
```

Planned API needs:

- Endpoint or query mode to fetch items optimized for review.
- Optional field to track last review date.
- Optional record of review sessions if history becomes useful.

For MVP, the weekly review can reuse existing inventory endpoints before adding a dedicated review model.

## AI Meal Suggestions

Status: implemented for MVP without database persistence.

```text
User opens Chef AI
        |
Mobile app loads active fridge items
        |
Mobile app hides expired items from AI selection
        |
User selects one or more items, or uses Select All
        |
Mobile app sends selected item names to POST /recipes/suggest
        |
Backend validates ingredient names
        |
Backend builds a controlled prompt
        |
Backend calls Gemini when configured
        |
Backend validates/parses JSON and falls back if needed
        |
API returns exactly 5 recipe suggestions
        |
Mobile app renders strict/flexible suggestions, extra ingredients, protein, and calories
```

Important rules:

- The AI provider must never connect directly to PostgreSQL.
- The mobile app must never call Gemini directly.
- Gemini API keys must stay in backend environment variables only.
- The backend decides exactly what ingredient text is sent to the AI provider.
- AI request/suggestion persistence is planned for later and is not part of the current MVP flow.

## 5. Why Each Technology Is Used

| Technology | Why it is used |
| --- | --- |
| React Native | Builds mobile UI for both Android and iPhone from one codebase |
| Expo | Simplifies local development, testing, builds, and device preview |
| TypeScript | Adds type safety across the mobile and backend codebases |
| Node.js | Good fit for JSON APIs and JavaScript/TypeScript teams |
| Express | Simple and practical REST API framework |
| PostgreSQL | Reliable relational database for users, inventory, settings, and AI request history |
| Prisma | Typed ORM, migrations, and cleaner database access from TypeScript |
| Docker Compose | Runs local services like API, database, Nginx, Prometheus, and Grafana consistently |
| Nginx | Reverse proxy for production-like routing and future TLS termination |
| Prometheus | Collects metrics from services |
| Grafana | Visualizes metrics and dashboards |
| Bash scripts | Automates repeatable operational tasks |
| REST API | Straightforward contract between mobile app and backend |
| Gemini AI integration | Generates meal suggestions from selected non-expired ingredients through the backend, with fallback suggestions |

## 6. Local Development Architecture

The local environment should be simple and reproducible.

Planned local services:

```text
Developer Machine
        |
        | Expo dev server
        v
Mobile app running in simulator or physical device
        |
        | REST API calls
        v
Docker Compose network
  - api: Node.js + Express
  - db: PostgreSQL
  - nginx: reverse proxy, optional locally
  - prometheus: planned metrics collection
  - grafana: planned dashboards
```

Expected local workflow:

- Run PostgreSQL through Docker Compose.
- Run the Express API locally or inside Docker Compose.
- Run the Expo app from the developer machine.
- Use environment variables to point the mobile app to the local API URL.
- Use Prisma migrations to keep the database schema in sync.

Practical local priorities:

- Fast startup.
- Clear `.env` files.
- Seed data for categories and icons.
- Easy reset of local database data.

## 7. Future Production Architecture

Status: planned.

Production should use the same core components but with stronger operational boundaries.

```text
Internet
   |
   v
Nginx
   |
   v
Express API service
   |
   v
PostgreSQL database

Observability:
Express API -> Prometheus -> Grafana
System logs -> log storage or server log files

Operations:
Backup scripts -> secure backup storage
Restore scripts -> controlled restore process
```

Production goals:

- HTTPS through Nginx.
- API service isolated from direct public database access.
- PostgreSQL accessible only from trusted services.
- Regular backups.
- Health checks for API and database.
- Monitoring dashboards for uptime and performance.

This does not require a complex platform at MVP stage. The first production version can be small, as long as it has backups, environment separation, and a clear restore path.

## 8. Operational Concerns

## Health Checks

Planned endpoints:

- `GET /health`: confirms the API process is running.
- `GET /health/db`: confirms the API can reach PostgreSQL.

Expected checks:

- API process is alive.
- Database connection works.
- Required environment variables are present.

## Logs

The backend should log:

- Request method and path.
- Response status code.
- Validation errors.
- Authentication failures without exposing secrets.
- Unexpected server errors.

Logs should not include:

- Passwords.
- Auth tokens.
- API keys.
- Full AI prompts if they may contain sensitive user data.

## Backups

PostgreSQL backups are required before production use.

Planned backup approach:

- Use a Bash script to run a PostgreSQL dump.
- Store backups outside the running database container.
- Include timestamped backup filenames.
- Keep a documented retention policy.

## Restore

Restore must be tested, not only documented.

Planned restore approach:

- Stop services that write to the database.
- Restore from a selected backup file.
- Run database checks after restore.
- Restart API service.
- Verify application health checks.

## Environment Variables

Environment variables should configure runtime behavior.

Expected variables:

- API port.
- Database connection URL.
- JWT or auth secret.
- AI provider API key, planned.
- Mobile API base URL.
- Node environment.

Rules:

- Do not commit real secrets.
- Keep example variables in a safe example file.
- Use different values for local, staging, and production.

## Monitoring

Prometheus and Grafana are planned for production-like visibility.

Metrics to track:

- API uptime.
- Request count.
- Error count.
- Request latency.
- Database connection status.
- CPU and memory usage.

For MVP, basic health checks and logs are more important than advanced dashboards.

## 9. Security Considerations

## API Keys

- AI provider API keys must stay on the backend.
- The mobile app must never contain private AI keys.
- Secrets should be loaded from environment variables.

## Input Validation

The API must validate:

- Login and registration fields.
- Item names.
- Quantity values.
- Expiration dates.
- Category and icon IDs.
- Chef AI selected item IDs.

Validation should happen on both layers:

- Mobile app validation for better user experience.
- Backend validation for real security and data integrity.

## Authorization

- Every private endpoint must identify the authenticated user.
- Users must only read and modify their own fridge items, settings, and AI requests.
- Database queries should always filter by the authenticated user where user-owned data is involved.

## No Direct AI Access To Database

The AI provider must not have direct database access.

Correct pattern:

```text
PostgreSQL -> Backend API -> Sanitized prompt -> AI provider
```

Incorrect pattern:

```text
AI provider -> PostgreSQL
```

The backend controls:

- Which items are included.
- Which fields are sent.
- How prompts are built.
- What response format is accepted.

## 10. MVP Scope vs Future Scope

## MVP Scope

The MVP should focus on the smallest useful version of FridgeDB:

- User registration and login.
- Home summary.
- View fridge items.
- Add fridge item.
- Edit fridge item.
- Delete fridge item.
- Categories and icons.
- User settings with daily reminder preference.
- Basic Chef AI endpoint shape, even if AI integration is mocked or planned.
- Local development with Docker Compose and PostgreSQL.
- Basic health check endpoint.

## Future Scope

Planned future work:

- Real AI provider integration.
- Weekly inventory review flow.
- Push notifications or local notifications.
- Production Nginx setup with HTTPS.
- Prometheus metrics endpoint.
- Grafana dashboards.
- Automated backup and restore scripts.
- Staging environment.
- User-visible Chef AI history.
- More detailed item units, such as grams, liters, or pieces.
- Shared refrigerators or household accounts.

## Architecture Principles

- Keep the mobile app focused on user experience.
- Keep business rules and sensitive logic in the backend.
- Keep PostgreSQL private and accessed through Prisma.
- Start with simple REST endpoints before adding extra infrastructure.
- Mark planned features clearly until they are implemented.
- Prefer operational basics, like backups and health checks, before advanced platform work.
