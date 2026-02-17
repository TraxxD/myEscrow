const nodemailer = require('nodemailer');
const db = require('../config/db');
const { renderTemplate } = require('./templateRenderer');
const logger = require('../utils/logger');

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

let transporter = null;

/**
 * Initialize the email transporter
 */
function initEmail() {
  if (!EMAIL_ENABLED) {
    logger.info('email', 'Email disabled (EMAIL_ENABLED=false)');
    return false;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  logger.info('email', `Email transport initialized (${process.env.SMTP_HOST})`);
  return true;
}

/**
 * Send a single email
 */
async function sendEmail(to, subject, html) {
  if (!transporter) {
    logger.warn('email', `Would send to ${to}: ${subject} (email disabled)`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@myescrow.com',
      to,
      subject,
      html,
    });
    logger.info('email', `Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    logger.error('email', `Failed to send to ${to}: ${err.message}`);
    throw err;
  }
}

/**
 * Process the email queue — called by scheduler
 */
async function processQueue() {
  const pending = db.emailQueue.getPending();
  if (pending.length === 0) return;

  logger.info('email', `Processing ${pending.length} queued email(s)`);

  for (const email of pending) {
    try {
      const html = renderTemplate(email.template, email.templateData);
      await sendEmail(email.to_email, email.subject, html);
      db.emailQueue.updateStatus(email.id, 'sent');
    } catch (err) {
      db.emailQueue.updateStatus(email.id, 'failed', err.message);
    }
  }
}

/**
 * Helper: queue a notification email
 */
function queueEmail(to_email, subject, template, templateData = {}) {
  db.emailQueue.enqueue({ to_email, subject, template, templateData });
}

module.exports = {
  initEmail,
  sendEmail,
  processQueue,
  queueEmail,
  get isEnabled() { return EMAIL_ENABLED; },
};
