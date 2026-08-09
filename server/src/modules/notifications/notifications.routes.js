import { Router } from 'express';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { encrypt } from '../../helpers/crypto.js';
import { attemptSend } from './notifications.service.js';

const router = Router();
router.use(requireAuth);

// ---- Settings ----
router.get('/settings', requireRole('admin', 'developer'), async (req, res) => {
  const rows = await db('notification_settings').where({ school_id: req.user.school_id });
  // Never return the encrypted secrets to the client — only whether one is set.
  const data = rows.map(({ smtp_password_encrypted, sms_api_key_encrypted, ...rest }) => ({
    ...rest,
    hasSmtpPassword: !!smtp_password_encrypted,
    hasSmsApiKey: !!sms_api_key_encrypted
  }));
  res.json({ success: true, data });
});

router.put('/settings/email', requireRole('admin', 'developer'), async (req, res) => {
  const { smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_address, smtp_from_name, is_active } = req.body;
  const existing = await db('notification_settings').where({ school_id: req.user.school_id, channel: 'email' }).first();
  const row = {
    smtp_host, smtp_port, smtp_username, smtp_from_address, smtp_from_name, is_active,
    ...(smtp_password ? { smtp_password_encrypted: encrypt(smtp_password) } : {})
  };
  if (existing) await db('notification_settings').where({ id: existing.id }).update({ ...row, updated_at: db.fn.now() });
  else await db('notification_settings').insert({ school_id: req.user.school_id, channel: 'email', ...row });
  res.json({ success: true, data: null });
});

router.put('/settings/sms', requireRole('admin', 'developer'), async (req, res) => {
  const { sms_provider, sms_api_key, sms_sender_id, is_active } = req.body;
  const existing = await db('notification_settings').where({ school_id: req.user.school_id, channel: 'sms' }).first();
  const row = {
    sms_provider, sms_sender_id, is_active,
    ...(sms_api_key ? { sms_api_key_encrypted: encrypt(sms_api_key) } : {})
  };
  if (existing) await db('notification_settings').where({ id: existing.id }).update({ ...row, updated_at: db.fn.now() });
  else await db('notification_settings').insert({ school_id: req.user.school_id, channel: 'sms', ...row });
  res.json({ success: true, data: null });
});

// ---- Log ----
router.get('/', async (req, res) => {
  let query = db('notification_log').where({ school_id: req.user.school_id }).orderBy('created_at', 'desc').limit(100);
  if (req.query.status) query = query.andWhere('status', req.query.status);
  if (req.query.channel) query = query.andWhere('channel', req.query.channel);
  res.json({ success: true, data: await query });
});

// ---- Send ----
router.post('/send', requireRole('admin', 'developer', 'bursar', 'principal'), async (req, res) => {
  const { channel, recipient, message, related_student_id } = req.body;
  const result = await attemptSend({ schoolId: req.user.school_id, channel, recipient, message, relatedStudentId: related_student_id });
  res.status(201).json({ success: true, data: result });
});

// Bulk send — same underlying attemptSend per recipient, used for e.g. "remind every defaulter in a class."
router.post('/bulk', requireRole('admin', 'developer', 'bursar', 'principal'), async (req, res) => {
  const { channel, recipients, message } = req.body; // recipients: [{ recipient, relatedStudentId? }]
  const results = [];
  for (const r of recipients) {
    results.push(await attemptSend({ schoolId: req.user.school_id, channel, recipient: r.recipient, message, relatedStudentId: r.relatedStudentId }));
  }
  const sent = results.filter((r) => r.status === 'sent').length;
  res.status(201).json({ success: true, data: { sent, failed: results.length - sent, total: results.length } });
});

router.post('/:id/resend', requireRole('admin', 'developer', 'bursar', 'principal'), async (req, res) => {
  const original = await db('notification_log').where({ id: req.params.id, school_id: req.user.school_id }).first();
  if (!original) return res.status(404).json({ success: false, message: 'Notification not found' });
  const result = await attemptSend({
    schoolId: req.user.school_id,
    channel: original.channel,
    recipient: original.recipient,
    message: original.message,
    relatedStudentId: original.related_student_id
  });
  res.status(201).json({ success: true, data: result });
});

export default router;
