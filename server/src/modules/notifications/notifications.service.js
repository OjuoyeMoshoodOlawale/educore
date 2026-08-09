import nodemailer from 'nodemailer';
import { db } from '../../config/db.js';
import { decrypt } from '../../helpers/crypto.js';

// Actually attempts delivery when the school has configured and activated a provider for this
// channel; logs an honest failure with the real reason when they haven't. Never fakes a "sent"
// status — that would be worse than the honest "not configured" state this replaces.
export async function attemptSend({ schoolId, channel, recipient, message, relatedStudentId }) {
  const settings = await db('notification_settings').where({ school_id: schoolId, channel, is_active: true }).first();

  let status = 'failed';
  let providerResponse = `No ${channel === 'email' ? 'SMTP' : 'SMS'} provider configured for this school yet`;

  if (!settings) {
    // fall through with the "not configured" message above
  } else if (channel === 'email') {
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: settings.smtp_port === 465,
        auth: { user: settings.smtp_username, pass: decrypt(settings.smtp_password_encrypted) }
      });
      const info = await transporter.sendMail({
        from: `"${settings.smtp_from_name || 'EduCore'}" <${settings.smtp_from_address}>`,
        to: recipient,
        subject: 'Message from your school',
        text: message
      });
      status = 'sent';
      providerResponse = nodemailer.getTestMessageUrl?.(info) || info.messageId || 'Delivered';
    } catch (err) {
      providerResponse = err.message;
    }
  } else if (channel === 'sms') {
    // Generic REST-style SMS send (Termii-shaped). Without a real account/key configured this
    // will fail honestly with whatever the provider actually says — never simulated as sent.
    try {
      const apiKey = decrypt(settings.sms_api_key_encrypted);
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient, from: settings.sms_sender_id, sms: message, type: 'plain', channel: 'generic', api_key: apiKey })
      });
      const body = await response.json();
      if (response.ok && !body.message?.toLowerCase().includes('error')) {
        status = 'sent';
        providerResponse = body.message_id || 'Delivered';
      } else {
        providerResponse = body.message || `Provider returned ${response.status}`;
      }
    } catch (err) {
      providerResponse = err.message;
    }
  }

  const [id] = await db('notification_log').insert({
    school_id: schoolId,
    channel,
    recipient,
    message,
    related_student_id: relatedStudentId,
    status,
    provider_response: providerResponse
  });
  return db('notification_log').where({ id }).first();
}
