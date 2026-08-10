import { Router } from 'express';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { PERMISSION_CATALOG } from '../../middleware/permissions.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole('admin', 'developer'));

// One call gives the settings screen everything it needs: every user in the school, the full
// capability catalog (with each capability's role default), and any existing overrides —
// enough to render the whole matrix (role default vs. what's been specifically changed) at once.
router.get('/', async (req, res) => {
  const users = await db('users as u')
    .leftJoin('staff as s', 's.id', 'u.staff_id')
    .where('u.school_id', req.user.school_id)
    .select('u.id', 'u.email', 'u.role', 's.first_name', 's.last_name');

  const overrides = await db('permission_overrides').where({ school_id: req.user.school_id });

  res.json({ success: true, data: { users, catalog: PERMISSION_CATALOG, overrides } });
});

router.put('/:userId/:resource', async (req, res) => {
  const { userId, resource } = req.params;
  const { effect } = req.body; // 'allow' | 'deny' | null (null clears the override, back to role default)

  const existing = await db('permission_overrides').where({ user_id: userId, resource }).first();

  if (!effect) {
    if (existing) await db('permission_overrides').where({ id: existing.id }).del();
    return res.json({ success: true, data: null });
  }

  if (!['allow', 'deny'].includes(effect)) {
    return res.status(422).json({ success: false, errors: [{ field: 'effect', message: 'Must be allow, deny, or cleared' }] });
  }

  if (existing) {
    await db('permission_overrides').where({ id: existing.id }).update({ effect, created_by_staff_id: req.user.staff_id, updated_at: db.fn.now() });
  } else {
    await db('permission_overrides').insert({ school_id: req.user.school_id, user_id: userId, resource, effect, created_by_staff_id: req.user.staff_id });
  }
  res.json({ success: true, data: null });
});

export default router;
