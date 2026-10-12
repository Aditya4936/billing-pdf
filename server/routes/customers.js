import { Router } from 'express';
import mongoose from 'mongoose';
import { Customer } from '../models/Customer.js';
import { HttpError } from '../middleware/errors.js';

export function customersRouter({ sessions }) {
  const router = Router();
  router.use(sessions.requireAuth);

  // Saved buyers, most recently used first, for the "pick a saved buyer" list.
  router.get('/', async (req, res) => {
    const customers = await Customer.find({ user: req.user.id }).sort({ lastUsedAt: -1 }).limit(300).lean();
    res.json({
      customers: customers.map(({ _id, details, lastUsedAt }) => ({ id: String(_id), details, lastUsedAt })),
    });
  });

  router.delete('/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Customer not found.');
    const { deletedCount } = await Customer.deleteOne({ _id: req.params.id, user: req.user.id });
    if (!deletedCount) throw new HttpError(404, 'Customer not found.');
    res.json({ ok: true });
  });

  return router;
}
