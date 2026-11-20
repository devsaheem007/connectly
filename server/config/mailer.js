import nodemailer from 'nodemailer'
import { env } from './env.js'

export const emailEnabled = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)

const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null

/**
 * Sends an email. When SMTP is not configured (local development) the email is
 * printed to the server console instead, so the app is still fully testable.
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log(`\n📧 [email not configured — printed instead]\nTo: ${to}\nSubject: ${subject}\n${text}\n`)
    return { dev: true }
  }
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html, text })
  return { dev: false }
}
