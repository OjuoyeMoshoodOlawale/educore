import { Router } from 'express';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  let query = db('notification_log').where({ school_id: req.user.school_id }).orderBy('created_at', 'desc').limit(100);
  if (req.query.status) query = query.andWhere('status', req.query.status);
  if (req.query.channel) query = query.andWhere('channel', req.query.channel);
  res.json({ success: true, data: await query });
});

// No notification_settings (SMTP/SMS provider config) exists yet — that lands with Phase 5.
// Every send is logged honestly as failed with the real reason, rather than faking a delivery.
async function attemptSend(row) {
  const [id] = await db('notification_log').insert({
    ...row,
    status: 'failed',
    provider_response: 'No SMS/email provider configured for this school yet'
  });
  return db('notification_log').where({ id }).first();
}

router.post('/send', requireRole('admin', 'developer', 'bursar', 'principal'), async (req, res) => {
  const { channel, recipient, message, related_student_id } = req.body;
  const result = await attemptSend({ school_id: req.user.school_id, channel, recipient, message, related_student_id });
  res.status(201).json({ success: true, data: result });
});

router.post('/:id/resend', requireRole('admin', 'developer', 'bursar', 'principal'), async (req, res) => {
  const original = await db('notification_log').where({ id: req.params.id, school_id: req.user.school_id }).first();
  if (!original) return res.status(404).json({ success: false, message: 'Notification not found' });
  const result = await attemptSend({
    school_id: req.user.school_id,
    channel: original.channel,
    recipient: original.recipient,
    message: original.message,
    related_student_id: original.related_student_id
  });
  res.status(201).json({ success: true, data: result });
});

export default router;
