import { Router } from 'express';
import { User } from '../models/User.js';
import { sellerDetailsOf } from '../lib/seller.js';

export function profileRouter({ sessions }) {
  const router = Router();
  router.use(sessions.requireAuth);

  // The saved seller details, or { profile: null } for an account that has none yet.
  router.get('/', async (req, res) => {
    const user = await User.findById(req.user.id).select('profile');
    res.json({ profile: user?.profile?.toObject() ?? null });
  });

  // Saves the seller details from the form.
  router.put('/', async (req, res) => {
    const profile = { ...sellerDetailsOf(req.body), updatedAt: new Date() };
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { profile } }, { returnDocument: 'after' }).select(
      'profile',
    );
    res.json({ profile: user.profile.toObject() });
  });

  return router;
}
