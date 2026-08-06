import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { validate } from '../../helpers/validate.js';
import { signAccessToken, signRefreshToken, requireAuth } from '../../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password')
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.validated;
  const user = await db('users').where({ email }).first();

  // Same message whether the email doesn't exist or the password is wrong —
  // avoids letting the error itself confirm which emails are registered.
  const invalid = () => res.status(401).json({ success: false, message: 'Incorrect email or password' });

  if (!user) return invalid();
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return invalid();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    data: { accessToken, user: { id: user.id, email: user.email, role: user.role, school_id: user.school_id } }
  });
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await db('users').where({ id: payload.sub }).first();
    if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    res.json({ success: true, data: { accessToken: signAccessToken(user) } });
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired, please sign in again' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token');
  res.json({ success: true, data: null });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await db('users').where({ id: req.user.id }).first();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: { id: user.id, email: user.email, role: user.role, school_id: user.school_id } });
});

export default router;
