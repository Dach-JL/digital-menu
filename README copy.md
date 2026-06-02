# 🏨 QR-Code Hotel & Restaurant Services (Royal Home)

A modern, interactive guest portal and admin management system for hotels and restaurants. Guests can scan a QR code at their table or room to view the menu, see detailed nutrition and ingredient information, place orders, request calls (waiter/housekeeping), and leave feedback. The application supports multiple languages and features a full-fledged Admin dashboard for real-time operation tracking.

---

## 🚀 Key Features

### 👤 Guest Experience
- **Interactive Menu**: Browse room services, foods, and drinks.
- **Multilingual Support**: Fully localized in **English (EN)**, **Amharic (AM)**, and **Oromo (OM)**.
- **Detailed Product Metrics**: View list of ingredients and nutritional macros (kcal, protein, fat, carbs) for each service item.
- **Room/Table Detection**: Automatically extracts room/table numbers from the QR code query parameters (e.g., `?room=102`).
- **Ordering Basket**: Interactive cart to add multiple items, review prices, and place live room/table orders.
- **Service & Waiter Calls**: Quick-request button to call a waiter or request housekeeping/towels.
- **Favorites System**: Bookmark foods or services for quick access, cached locally and synced.
- **Feedback & Ratings**: Leave reviews and ratings on items or services.

### 🔑 Admin Experience
- **Live Calls Tracker**: Real-time list of guest requests (e.g., "Waiter call from Room 102") with status updates (Pending/Resolved).
- **Live Orders Queue**: Track incoming room orders, item quantities, total prices, and update status.
- **Feedback Manager**: Read customer comments and ratings.
- **Service Catalog CRUD**: Manage items with custom categories, subcategories, pricing, nutritional macros, images, and translations for all three languages.
- **QR Code Generator**: Create custom, printable QR codes pre-configured with table/room parameters for guests to scan.

---

## 🏗️ Architecture & Tech Stack

The application is built using a hybrid stack to support local flexibility and robust, serverless production deployments.

```
                    ┌────────────────────────┐
                    │      React Client      │
                    │   (Vite + TypeScript)  │
                    └───────────┬────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼ (Dev mode)                      ▼ (Production / Vercel)
     ┌───────────────────┐             ┌───────────────────┐
     │      PHP API      │             │  Vercel Serverless│
     │  (localhost:8000) │             │    Node API       │
     └─────────┬─────────┘             └─────────┬─────────┘
               │                                 │
               └────────────────┬────────────────┘
                                ▼
                    ┌────────────────────────┐
                    │     MySQL Database     │
                    │     (Aiven/Neon)       │
                    └────────────────────────┘
```

- **Frontend**: 
  - **Framework**: Vite + React 18 + TypeScript
  - **Styling**: Tailwind CSS + shadcn/ui components + Lucide Icons
  - **Localization**: `i18next` & `react-i18next`
- **Backend API**:
  - **Local Development**: PHP API (running on port `8000` from `public/api/*.php`) communicating with the database using PDO.
  - **Production (Vercel)**: Serverless Node.js endpoints (`api/*.ts`) using Drizzle ORM.
- **Database**:
  - MySQL database hosted on **Aiven Cloud** (or serverless Postgres via Neon) configured via the `DATABASE_URL` environment variable.

---

## 🗄️ Database Schema

The system uses **Drizzle ORM** and standard SQL schemas. The database contains the following tables:

| Table | Columns | Description |
|---|---|---|
| **`users`** | `id`, `email`, `username`, `password`, `role` (`user`/`admin`), `created_at` | System users and admin account credentials. |
| **`services`** | `id`, `name_en`, `name_am`, `name_om`, `description_en`, `description_am`, `description_om`, `type` (`food`/`drink`/`room`), `price`, `image_url`, `ingredients`, `macro_kcal`, `macro_protein`, `macro_fat`, `macro_carbs`, `beds`, `max_guests`, `is_available`, `room_number`, `subcategory`, `created_at` | Menu catalog, food details, room specs, and translations. |
| **`room_orders`** | `id`, `room_number`, `total_price`, `status` (`pending`/`completed`/etc.), `created_at` | Guest orders header. |
| **`order_items`** | `id`, `order_id`, `service_id`, `quantity`, `price` | Line items for room orders. |
| **`waiter_calls`** | `id`, `room_number`, `status` (`pending`/`resolved`), `created_at` | Waiter and housekeeping requests. |
| **`favorites`** | `id`, `user_id`, `service_id`, `created_at` | Linked guest/user favorite items. |
| **`feedback`** | `id`, `user_id`, `service_id`, `category`, `comment`, `rating`, `created_at` | Guest reviews and ratings. |

---

## ⚙️ Local Development Setup

To run the application locally on your machine, follow these instructions:

### Prerequisites
1. **Node.js** (v18 or higher) and **npm**.
2. **PHP** (v8.0 or higher) with PDO MySQL and SQLite extensions enabled (for running the local dev API server).

### Step 1: Clone and Install
Clone the repository and install the npm dependencies:
```sh
npm install
```

### Step 2: Environment Variables Configuration
Create a `.env` file in the root directory and specify your database connection URL (either MySQL or PostgreSQL):
```env
DATABASE_URL=mysql://user:password@host:port/database_name?ssl-mode=REQUIRED
```

### Step 3: Run the Local PHP API Server
In development, the frontend expects the PHP server to be running on port 8000:
```sh
npm run server
```
This runs: `php -c php.ini -S localhost:8000 -t public`.

### Step 4: Run the Vite Development Server
Start the frontend development server:
```sh
npm run dev
```
Open the local URL displayed in your console (usually `http://localhost:5173`).

> [!TIP]
> If you access the application on your mobile device (to test QR code scanning or live mobile flows), make sure both your computer and mobile device are on the same Wi-Fi network. Open the app using your computer's local IP address (e.g., `http://192.168.1.5:5173`). The frontend will automatically detect the hostname and route API calls to your local PHP server.

---

## 📦 Scripts Reference

The following scripts are available in the project:

| Script | Command | Description |
|---|---|---|
| **`dev`** | `vite` | Starts the Vite React frontend dev server with hot reload. |
| **`server`** | `php -c php.ini -S localhost:8000 -t public` | Starts the local PHP API server. |
| **`build`** | `vite build` | Compiles the production build of the React frontend. |
| **`build:dev`** | `vite build --mode development` | Generates a development build of the frontend. |
| **`preview`** | `vite preview` | Runs a local server to preview the built frontend. |
| **`lint`** | `eslint .` | Runs ESLint rules checking. |

---

## 🌐 Production Deployment

- **Hosting**: The frontend client and Node/TypeScript API are optimized to run on **Vercel**.
- **Serverless routing**: The Vercel configuration routes `/api/*` requests to the TypeScript files in `/api` instead of the local PHP scripts.
- **Meta Image Integration**: Standard preview URLs and Twitter cards have been optimized to point directly to custom branding assets such as `/royal-home.png`.
