import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/errors.js';

const BCRYPT_COST = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Compared against when the email is unknown, so a wrong email and a wrong password take as long.
const DECOY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const publicUser = (user) => ({ id: String(user._id), name: user.name, email: user.email });
const asText = (value) => (typeof value === 'string' ? value.trim() : '');

export function authRouter({ sessions, allowSignup = true }) {
  const router = Router();

  // Slows down password guessing: 30 attempts per 15 minutes per address.
  const attemptLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Wait a few minutes and try again.' },
  });

  router.post('/register', attemptLimit, async (req, res) => {
    if (!allowSignup) throw new HttpError(403, 'New accounts are turned off on this server. Ask the owner for access.');

    const name = asText(req.body?.name);
    const email = asText(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name) throw new HttpError(400, 'Enter your name.');
    if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, 'Enter a valid email address.');
    if (password.length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
    // bcrypt only reads the first 72 bytes; refuse longer ones instead of silently ignoring the rest.
    if (Buffer.byteLength(password) > 72) throw new HttpError(400, 'Use a password of 72 characters or fewer.');

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let user;
    try {
      user = await User.create({ name, email, passwordHash });
    } catch (error) {
      if (error.code === 11000) throw new HttpError(409, 'An account with this email already exists. Log in instead.');
      throw error;
    }

    sessions.start(res, user);
    res.status(201).json({ user: publicUser(user) });
  });

  router.post('/login', attemptLimit, async (req, res) => {
    const email = asText(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const user = email ? await User.findOne({ email }).select('+passwordHash') : null;
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DECOY_HASH);
    if (!user || !passwordOk) throw new HttpError(401, 'The email or password is not correct.');

    sessions.start(res, user);
    res.json({ user: publicUser(user) });
  });

  router.post('/logout', (req, res) => {
    sessions.end(res);
    res.json({ ok: true });
  });

  router.get('/me', sessions.requireAuth, (req, res) => {
    res.json({ user: { id: String(req.user.id), name: req.user.name, email: req.user.email } });
  });

  return router;
}
