import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const makeToken = user => jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim(); const email = String(req.body.email || '').trim().toLowerCase(); const password = String(req.body.password || '');
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ message: 'Enter a name, valid email, and password of at least 8 characters.' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,role', [name,email,hash]);
    const user = result.rows[0]; res.status(201).json({ token: makeToken(user), user });
  } catch (err) { if (err.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' }); next(err); }
});
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase(); const password = String(req.body.password || '');
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]); const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Invalid email or password.' });
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ token: makeToken(safeUser), user: safeUser });
  } catch (err) { next(err); }
});
router.get('/me', requireAuth, async (req, res, next) => {
  try { const result = await pool.query('SELECT id,name,email,role FROM users WHERE id=$1', [req.user.id]); if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' }); res.json(result.rows[0]); }
  catch (err) { next(err); }
});
export default router;
