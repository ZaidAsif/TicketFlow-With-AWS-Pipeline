# TicketFlow - Support Ticket Management System

A full-stack support ticket / feedback tracking application built with Next.js, Express, and MySQL.

## Features

### Public-Facing
- Submit support tickets (bug reports, feature requests, inquiries)
- Category selection from predefined list
- Optional contact email for follow-up
- Confirmation screen with ticket details

### Admin Dashboard
- **Authentication**: Basic auth login for admin access
- **Ticket Management**: View, filter, and update ticket statuses
- **Status Workflow**: Open → In Progress → Resolved
- **Statistics**: Real-time counts by status and category
- **Audit Trail**: Complete status change history for each ticket
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (React 18, TypeScript) |
| Backend | Express.js (Node.js, TypeScript) |
| Database | MySQL 8.0 (Amazon RDS production-ready) |
| Dev Tools | Docker Compose, Jest, Supertest |

## Architecture

```
                    ┌─────────────┐
                    │   Next.js   │
                    │  Frontend   │
                    │  :3000      │
                    └──────┬──────┘
                           │ HTTP (CORS)
                    ┌──────▼──────┐
                    │   Express   │
                    │   Backend   │
                    │   :4000     │
                    └──────┬──────┘
                           │ mysql2
                    ┌──────▼──────┐
                    │   MySQL    │
                    │   :3306    │
                    └─────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- MySQL 8.0 (or Docker)

### Option 1: Local Development

**1. Set up the database**

With Docker:
```bash
docker run --name ticket-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=ticket_system \
  -p 3306:3306 \
  -d mysql:8.0
```

Or use an existing MySQL instance.

**2. Configure environment**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Edit `backend/.env` with your database credentials.

**3. Initialize the database**

```bash
cd backend
npm install
npm run migrate
npm run seed
```

**4. Start the backend**

```bash
cd backend
npm run dev
```

**5. Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

**6. Open the app**

- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/health
- Admin login: http://localhost:3000/admin (default: admin / admin123)

### Option 2: Docker Compose (full stack)

```bash
docker-compose up --build
```

This starts MySQL, the backend, and the frontend together.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `127.0.0.1` |
| `DB_PORT` | Database port | `3306` |
| `DB_USER` | Database user | `root` |
| `DB_PASSWORD` | Database password | (empty) |
| `DB_NAME` | Database name | `ticket_system` |
| `PORT` | Backend server port | `4000` |
| `NODE_ENV` | Environment mode | `development` |
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password | `admin123` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:4000` |

## Running Tests

### Backend Tests

```bash
cd backend

# Unit tests (mocked DB)
npm run test:unit

# Integration tests (requires MySQL database)
npm run test:integration

# All tests
npm test
```

### Frontend Tests

```bash
cd frontend

# Component tests
npm test

# Watch mode
npm run test:watch
```

## Database

### Schema

```sql
categories (id, name)
tickets (id, title, description, category, status, contact_email, created_at, updated_at)
status_history (id, ticket_id, old_status, new_status, changed_at)
```

### Migration

Migrations are plain SQL files in `backend/migrations/`. To run them:

```bash
cd backend
npm run migrate
```

### Seed Data

Sample data is loaded via `backend/seed/seed.sql`. To seed:

```bash
cd backend
npm run seed
```

## RDS Deployment

To point this application at Amazon RDS (or any MySQL-compatible service):

1. Create an RDS MySQL instance
2. Run the migration against it:
   ```bash
   DB_HOST=<rds-endpoint> DB_USER=<user> DB_PASSWORD=<password> DB_NAME=<db-name> npm run migrate
   ```
3. Update the backend's environment variables to point at RDS:
   ```
   DB_HOST=<rds-endpoint>
   DB_PORT=3306
   DB_USER=<username>
   DB_PASSWORD=<password>
   DB_NAME=<database-name>
   ```
4. **No code changes required** — only environment variables need to change.

This has been verified: the application connects and functions correctly with different MySQL instances by changing only the database connection environment variables.

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check with DB status |
| GET | `/api/categories` | List all categories |
| POST | `/api/tickets` | Submit a new ticket |
| GET | `/api/tickets/:id` | Get a single ticket |

### Admin (requires Basic Auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/tickets` | List all tickets (with filters) |
| GET | `/api/admin/tickets/stats` | Ticket statistics |
| GET | `/api/admin/tickets/:id` | Get ticket with history |
| PATCH | `/api/admin/tickets/:id` | Update ticket status |

## Project Structure

```
/
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # Pages (routing)
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities and API client
│   │   └── __tests__/    # Frontend tests
│   ├── Dockerfile
│   └── package.json
├── backend/              # Express API
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Auth middleware
│   │   ├── __tests__/    # Backend tests (unit + integration)
│   │   ├── config.ts     # Environment configuration
│   │   ├── db.ts         # Database connection pool
│   │   ├── types.ts      # TypeScript type definitions
│   │   └── index.ts      # Entry point
│   ├── migrations/       # SQL migration files
│   ├── seed/             # Seed data
│   ├── Dockerfile
│   └── package.json
├── docs/
│   ├── aws-infrastructure-and-pipeline-diagram.png
│   └── qa-checklist.md
├── docker-compose.yml
└── README.md
```

## Infrastructure Readiness

This application is built to be deployment-ready:

- ✅ All configuration via environment variables
- ✅ Stateless backend (no in-memory sessions, no local file writes)
- ✅ Health check endpoint (`GET /health`)
- ✅ Structured logging to stdout only
- ✅ CORS explicitly configurable via env var
- ✅ Dockerfiles for both frontend and backend
- ✅ No cloud SDK calls or AWS-specific code
- ✅ `DATABASE_URL` swap without code changes
