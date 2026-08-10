import { Router } from 'express';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('developer'));

const MODULES = ['fees', 'report_card'];

router.get('/modules', async (req, res) => {
  const existing = await db('school_modules').where({ school_id: req.user.school_id });
  const data = MODULES.map((m) => existing.find((e) => e.module === m) || { module: m, is_active: false });
  res.json({ success: true, data });
});

router.put('/modules/:module', async (req, res) => {
  const { module } = req.params;
  if (!MODULES.includes(module)) return res.status(404).json({ success: false, message: 'Unknown module' });

  const { is_active } = req.body;
  const existing = await db('school_modules').where({ school_id: req.user.school_id, module }).first();
  const row = { is_active, activated_by_staff_id: req.user.staff_id, activated_at: is_active ? db.fn.now() : null };
  if (existing) await db('school_modules').where({ id: existing.id }).update({ ...row, updated_at: db.fn.now() });
  else await db('school_modules').insert({ school_id: req.user.school_id, module, ...row });

  res.json({ success: true, data: null });
});

export default router;
