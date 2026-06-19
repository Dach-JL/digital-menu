import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const host = req.headers.host || `localhost:${PORT}`;
  const parsedUrl = new URL(req.url || '', `http://${host}`);
  const pathname = parsedUrl.pathname || '';

  // Only route /api/* requests
  if (!pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  // Extract the handler name (e.g. /api/users => users)
  // Strip any trailing .php or .ts
  const apiRoute = pathname.slice(5).replace(/\.php$/, '').replace(/\.ts$/, '');
  
  // Resolve the handler file path
  // E.g. /api/users -> api/users.ts
  const handlerPath = path.resolve(__dirname, 'api', `${apiRoute}.ts`);

  if (!fs.existsSync(handlerPath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `API route ${apiRoute} not found` }));
    return;
  }

  // Build query object from SearchParams
  const query: Record<string, string> = {};
  parsedUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  // Read request body for write methods
  let body: any = {};
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method || '')) {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const rawBody = Buffer.concat(buffers).toString();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
    } catch (e) {
      // Body parsing failed or request was aborted
    }
  }

  // Mock Vercel response helper methods
  const vercelRes: any = res;
  vercelRes.status = (statusCode: number) => {
    res.statusCode = statusCode;
    return vercelRes;
  };
  vercelRes.json = (data: any) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(data));
    return vercelRes;
  };
  vercelRes.send = (data: any) => {
    res.end(data);
    return vercelRes;
  };

  const vercelReq: any = req;
  vercelReq.query = query;
  vercelReq.body = body;

  try {
    // Dynamic import of the TS file using tsx dynamic execution
    // Add cache buster query parameter to ensure changes to backend code are loaded without restarting the server
    const module = await import(`./api/${apiRoute}.ts?update=${Date.now()}`);
    const handler = module.default;
    
    if (typeof handler !== 'function') {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Route ${apiRoute} does not export a default handler` }));
      return;
    }

    await handler(vercelReq, vercelRes);
  } catch (error: any) {
    console.error(`Error handling ${pathname}:`, error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error.message || 'Internal Server Error' }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Node local dev API server running at http://localhost:${PORT}`);
});
