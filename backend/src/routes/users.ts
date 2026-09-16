import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { users } from '../schema.js';
import { eq, inArray, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const router = Router();

// Handle login
async function handleLogin(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const rows = await db.select().from(users).where(eq(users.email, email));
  const user = rows[0];
  if (user && await bcrypt.compare(password, user.password)) {
    const { password: _, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
}

// Handle register
async function handleRegister(req: Request, res: Response) {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ error: 'Missing required fields' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const [inserted] = await db.insert(users).values({
      email,
      username,
      password: hash,
      role: 'user'
    }).returning();

    const { password: _, ...safeUser } = inserted;
    return res.json({ success: true, user: safeUser });
  } catch (e: any) {
    if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
      return res.status(409).json({ error: 'Email or username already exists.' });
    }
    throw e;
  }
}

// Handle list admins
async function handleListAdmins(req: Request, res: Response) {
  const rows = await db.select({
    id: users.id,
    email: users.email,
    username: users.username,
    role: users.role,
    created_at: users.created_at
  })
  .from(users)
  .where(inArray(users.role, ['admin', 'admin_room', 'admin_food', 'admin_waiter']))
  .orderBy(desc(users.created_at));

  return res.json(rows);
}

// Handle create admin
async function handleCreateAdmin(req: Request, res: Response) {
  const { email, username, password, role } = req.body;
  if (!email || !username || !password || !role) return res.status(400).json({ error: 'Missing required fields' });

  const validRoles = ['admin', 'admin_room', 'admin_food', 'admin_waiter'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid admin role' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const [inserted] = await db.insert(users).values({
      email,
      username,
      password: hash,
      role
    }).returning();

    const { password: _, ...safeAdmin } = inserted;
    return res.json({ success: true, admin: safeAdmin });
  } catch (e: any) {
    if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
      return res.status(409).json({ error: 'Email or username already exists.' });
    }
    throw e;
  }
}

// Handle delete admin
async function handleDeleteAdmin(req: Request, res: Response) {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing admin ID' });

  await db.delete(users).where(eq(users.id, Number(id)));
  return res.json({ success: true });
}

// General dispatcher supporting ?action=...
router.all('/', async (req: Request, res: Response) => {
  const action = req.query.action as string;

  try {
    if (action === 'login') return await handleLogin(req, res);
    if (action === 'register') return await handleRegister(req, res);
    if (action === 'list_admins') return await handleListAdmins(req, res);
    if (action === 'create_admin') return await handleCreateAdmin(req, res);
    if (action === 'delete_admin') return await handleDeleteAdmin(req, res);

    return res.status(400).json({ error: 'Invalid or missing action query parameter' });
  } catch (error: any) {
    console.error(`Error in users handler (${action}):`, error);
    return res.status(500).json({ error: error.message });
  }
});

// Also expose explicit sub-routes
router.post('/login', handleLogin);
router.post('/register', handleRegister);
router.get('/admins', handleListAdmins);
router.post('/admins', handleCreateAdmin);
router.delete('/admins', handleDeleteAdmin);

export default router;
