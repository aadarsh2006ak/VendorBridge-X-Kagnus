import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (env.NODE_ENV === 'test') {
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return transporter;
  }

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587,
      secure: false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } else {
    // Generate Ethereal test account in development
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('✉️  Ethereal test mailer initialized:', testAccount.user);
  }

  return transporter;
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<void> {
  const resetLink = `${env.PASSWORD_RESET_URL_BASE}?token=${resetToken}`;

  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: env.MAIL_FROM,
      to: toEmail,
      subject: 'VendorBridge — Password Reset Request',
      html: `
        <div style="font-family: sans-serif; background: #0B0D0C; color: #F4F6F5; padding: 24px; border-radius: 8px;">
          <h2 style="color: #22C55E;">VendorBridge ERP</h2>
          <p>You requested a password reset for your account associated with <strong>${toEmail}</strong>.</p>
          <p>Click the link below to set a new password. This link is single-use and will expire in 30 minutes:</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #15803D; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </p>
          <p style="color: #9AA5A0; font-size: 13px;">If you did not request this reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log(`✉️  Password reset email dispatched for ${toEmail}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`🔗 [DEV RESET LINK]: ${resetLink}`);
  } catch (error) {
    console.error('❌ Failed to dispatch password reset email:', error);
    // Notice: Never expose email dispatch errors to client to keep generic response
  }
}
