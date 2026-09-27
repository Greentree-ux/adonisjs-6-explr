import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

/**
 * SMTP authentication is opt-in, keyed on SMTP_USERNAME being set.
 *
 * Local development sends to Mailpit on localhost:1025, which accepts
 * unauthenticated mail — so with no username configured the auth block is
 * omitted entirely rather than sent empty. Practically no production relay
 * accepts unauthenticated mail, and this application sends invitations,
 * password resets and reminders, so a deployment must set both variables.
 *
 * A username without a password is always a misconfiguration: it would fail at
 * send time, silently dropping mail that the application believes it delivered.
 * Refuse to boot instead.
 *
 * The username is trimmed so that a blank-but-present value — the shape
 * .env.example ships, and what a half-filled template leaves behind — counts as
 * "not configured" rather than as a username that happens to be spaces. The
 * password is deliberately not trimmed: surrounding whitespace could be
 * significant in a generated secret.
 */
const smtpUsername = env.get('SMTP_USERNAME')?.trim()
const smtpPassword = env.get('SMTP_PASSWORD')

if (smtpUsername && !smtpPassword) {
  throw new Error(
    'SMTP_USERNAME is set but SMTP_PASSWORD is missing. Set both to enable authenticated SMTP, or neither to send unauthenticated mail (local Mailpit only).'
  )
}

const smtpAuth = smtpUsername
  ? { auth: { type: 'login' as const, user: smtpUsername, pass: smtpPassword! } }
  : {}

const mailConfig = defineConfig({
  default: 'smtp',

  from: {
    address: env.get('MAIL_FROM_ADDRESS', 'noreply@example.com'),
    name: env.get('MAIL_FROM_NAME', 'AdonisJS App'),
  },

  /**
   * The mailers object can be used to configure multiple mailers
   * each using a different transport or same transport with different
   * options.
   */
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
      ...smtpAuth,
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}