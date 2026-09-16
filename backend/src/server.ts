import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import servicesRouter from './routes/services.js';
import ordersRouter from './routes/orders.js';
import callsRouter from './routes/calls.js';
import feedbackRouter from './routes/feedback.js';
import favoritesRouter from './routes/favorites.js';
import usersRouter from './routes/users.js';
import migrateRouter, { runMigrations } from './routes/migrate.js';
import testPusherRouter from './routes/test-pusher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for all incoming requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers with large limit for image data
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes (with and without .php aliases for complete backward-compatibility)
const routes = [
  { path: 'services', router: servicesRouter },
  { path: 'orders', router: ordersRouter },
  { path: 'calls', router: callsRouter },
  { path: 'feedback', router: feedbackRouter },
  { path: 'favorites', router: favoritesRouter },
  { path: 'users', router: usersRouter },
  { path: 'migrate', router: migrateRouter },
  { path: 'test-pusher', router: testPusherRouter },
];

for (const { path: routePath, router } of routes) {
  app.use(`/api/${routePath}`, router);
  app.use(`/api/${routePath}.php`, router);
}

// Root status route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Digital Menu Backend API is operational',
    health: '/health',
    endpoints: [
      '/api/services',
      '/api/orders',
      '/api/calls',
      '/api/feedback',
      '/api/favorites',
      '/api/users'
    ]
  });
});

// 404 Handler for unrecognized /api routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.originalUrl} not found` });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    error: err?.message || 'Internal Server Error',
    tip: !process.env.DATABASE_URL ? 'Make sure DATABASE_URL is set in Vercel Project Settings > Environment Variables.' : undefined
  });
});

// Auto-run migrations and start server for standalone/local development
async function startServer() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('⚠️ Database migration failed on startup:', err);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Digital Menu Backend API running at http://localhost:${PORT}`);
    console.log(`📡 Connected to Neon PostgreSQL database.`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️ Port ${PORT} is currently in use by another process.`);
      console.error(`👉 Please terminate any existing server process running on port ${PORT} and restart.`);
    } else {
      console.error('Server error:', err);
    }
  });
}

// In Vercel serverless environment, export app without calling app.listen()
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
if (!isVercel) {
  startServer();
}

export default app;
