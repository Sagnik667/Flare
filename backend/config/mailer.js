import nodemailer from 'nodemailer';
import logger from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'Flare <noreply@flare.app>';

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else {
  logger.warn('SMTP credentials missing. Mailer initialized in development logging mode.');
}

export const sendMail = async ({ to, subject, html }) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
      });
      logger.info(`Email sent successfully: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Nodemailer failed to send email. Logging content:', error);
      logger.info(`DEV MAIL OUTBOX -> To: ${to} | Subject: ${subject}`);
      // Return dummy object to prevent endpoint failures
      return { messageId: 'dev-mode-fallback-id' };
    }
  } else {
    logger.info(`DEV MAIL OUTBOX -> To: ${to} | Subject: ${subject}`);
    logger.debug(`HTML Content: \n${html}`);
    return { messageId: 'dev-mode-logged-id' };
  }
};

export default {
  sendMail,
};
