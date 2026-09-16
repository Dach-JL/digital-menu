# 🏨 QR-Code Hotel & Restaurant Services (Royal Home)

A modern, interactive guest portal and admin management system for hotels and restaurants. Guests can scan a QR code at their table or room to view the menu, explore nutritional macros and ingredient details, place live orders, request waiter or housekeeping assistance, and submit feedback. The application supports multiple languages and features a real-time Admin Operations Hub.

---

## 🏗️ Architecture & Project Structure

The project is structured into two clean, independent directories:

```
Digital-Menu/
├── frontend/             # React + Vite Client Application
│   ├── src/              # React components, pages, hooks, contexts, stores
│   ├── public/           # Static assets, branding, and i18n locales
│   ├── index.html        # HTML entry
│   ├── package.json      # Frontend dependencies & scripts
│   ├── vite.config.ts    # Vite configuration
│   └── tailwind.config.ts# Tailwind CSS configuration
│
├── backend/              # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── db.ts         # Neon PostgreSQL connection (Drizzle ORM)
│   │   ├── schema.ts     # Drizzle PostgreSQL schema definitions
│   │   ├── pusher.ts     # Pusher real-time WebSocket publisher
│   │   ├── rate-limit.ts # Upstash Redis rate limiting utility
│   │   ├── routes/       # Express route handlers (services, orders, calls, etc.)
│   │   └── server.ts     # Express server entry point (port 8000)
│   ├── package.json      # Backend dependencies & scripts
│   └── tsconfig.json     # Backend TypeScript configuration
│
├── package.json          # Root workspace scripts (run dev, server, client, build)
└── .env                  # Database and API environment variables
```

---

## 🚀 Tech Stack

- **Frontend (`/frontend`)**:
  - **Framework**: Vite + React 18 + TypeScript
  - **Styling**: Tailwind CSS + Radix UI (shadcn/ui) + Lucide Icons + Embla Carousel
  - **State Management**: TanStack React Query + Zustand
  - **Real-Time Updates**: Pusher WebSockets (`pusher-js`)
  - **Localization**: `i18next` & `react-i18next` (English, Amharic, Afaan Oromoo, Sidama)
- **Backend (`/backend`)**:
  - **Runtime & Server**: Node.js + Express + TypeScript (`tsx`)
  - **Database & ORM**: **Neon Serverless PostgreSQL** via `@neondatabase/serverless` & **Drizzle ORM** (`drizzle-orm/neon-http` / `drizzle-orm/pg-core`)
  - **Real-Time Engine**: Pusher Channels
  - **Rate Limiting**: Upstash Redis with fail-open resilience
  - **Authentication**: `bcryptjs` password hashing and role-based access control

---

## ⚙️ Getting Started & Running Locally

### Prerequisites
- **Node.js** (v18 or higher) and **npm**

### Step 1: Environment Variables
Ensure a `.env` file exists at the project root with your Neon PostgreSQL connection string:
```env
DATABASE_URL="postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require&channel_binding=require"
```
*(Optional Pusher credentials for real-time order alerts:)*
```env
PUSHER_APP_ID="your_app_id"
PUSHER_KEY="your_key"
PUSHER_SECRET="your_secret"
PUSHER_CLUSTER="mt1"
```

### Step 2: Install Dependencies
```sh
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Step 3: Run Database Migrations
Migrations automatically run when the backend server starts, or you can run them manually:
```sh
npm run migrate
```
*This initializes all tables on your Neon database and seeds the default administrator account:*
- **Admin Email**: `admin@admin.com`
- **Password**: `password`

### Step 4: Run the Application

#### 1. Start Backend API Server (Port 8000):
```sh
cd backend
npm run server
```

#### 2. Start Frontend Client (Port 8080):
```sh
cd frontend
npm run dev
```

---

## 📦 Scripts Reference

### Backend (`/backend`)
| Command | Action |
|---|---|
| `npm run server` | Starts the Express backend on `http://localhost:8000` with hot-reload (`tsx watch`). |
| `npm run dev` | Alias for `npm run server`. |
| `npm run migrate` | Executes PostgreSQL table migrations on Neon DB. |
| `npm run build` | Compiles TypeScript into `dist/`. |

### Frontend (`/frontend`)
| Command | Action |
|---|---|
| `npm run dev` | Starts the Vite React development server. |
| `npm run build` | Builds the production bundle of the frontend. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Checks ESLint rules. |