/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  /*
  | Read by config/logger.ts as the logger's "name" field. It was previously
  | consumed without being declared here, so an environment that omitted it
  | produced log lines with no service name — invisible locally and unhelpful in
  | aggregated production logs. Defaulted rather than required so that an
  | existing .env without it still boots.
  */
  APP_NAME: (_key, value) => value?.trim() || 'AdonisJSApp',

  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Reverse proxy trust
  |----------------------------------------------------------
  |
  | Peer addresses whose X-Forwarded-* headers may be believed. Passed to
  | proxy-addr by config/app.ts, which explains the consequences. Defaults to
  | "loopback" — today's behaviour — and should be "loopback,uniquelocal"
  | behind a proxy running as a separate container.
  |
  */
  TRUST_PROXY: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  SMTP_HOST: Env.schema.string(),
  SMTP_PORT: Env.schema.string(),
  MAIL_FROM_ADDRESS: Env.schema.string.optional(),
  MAIL_FROM_NAME: Env.schema.string.optional(),

  /*
  | Both optional so that local development against Mailpit, which accepts
  | unauthenticated mail on localhost:1025, needs no credentials. Setting
  | SMTP_USERNAME turns on authentication (see config/mail.ts), and a real
  | relay will require both.
  */
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for background reminder worker startup
  |----------------------------------------------------------
  */
  REMINDER_WORKER_ENABLED: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Business timezone
  |----------------------------------------------------------
  |
  | Distinct from the TZ of the process, which should be UTC so that instants
  | and logs are unambiguous. This is the timezone the *business* thinks in, and
  | its only job is to anchor calendar dates to real instants.
  |
  | The eight `date` columns in this schema — joining dates, role-change dates,
  | action-plan milestones — are calendar facts, not moments. "15 June" is true
  | regardless of where you read it from. But a reminder derived from one has to
  | fire at some actual instant, and choosing that instant requires a timezone.
  | Without this variable the anchor is implicitly midnight in whatever zone the
  | Node process happens to run in, which is an accident rather than a decision.
  |
  | When users span multiple timezones, this becomes the default for users who
  | have not set their own rather than a global truth. See
  | ReminderService.anchorCalendarDate, which is the single place this is used.
  |
  */
  APP_TIMEZONE: (key, value) => {
    const zone = value?.trim() || 'Asia/Kolkata'

    /**
     * Intl throws for an unknown zone, which turns a typo such as
     * "Asia/Kolkatta" into a boot failure rather than a silent fallback to UTC
     * that shifts every reminder by hours.
     */
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: zone })
    } catch {
      throw new Error(
        `Invalid environment variable "${key}". "${zone}" is not a recognised IANA timezone name. Use a name such as "Asia/Kolkata", "Europe/London" or "UTC".`
      )
    }

    return zone
  },

  /*
  |----------------------------------------------------------
  | Hour of day at which date-derived reminders are sent
  |----------------------------------------------------------
  |
  | Local to APP_TIMEZONE, 0-23. Reminders are scheduled relative to calendar
  | dates, so they need a time of day; without one they land at midnight, which
  | nobody chose and nobody reads.
  |
  */
  REMINDER_SEND_HOUR: (key, value) => {
    if (value === undefined || value.trim() === '') {
      return 9
    }

    const hour = Number(value.trim())
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new Error(
        `Invalid environment variable "${key}". Expected an integer hour between 0 and 23, received "${value}".`
      )
    }

    return hour
  },

  /*
  |----------------------------------------------------------
  | Public base URL of this application
  |----------------------------------------------------------
  |
  | Used to build the links in outgoing mail: employee invitations, password
  | resets and org-admin onboarding. Those emails go to real people, so a wrong
  | value here is not a local inconvenience — it sends recipients to an address
  | that means nothing to them, and nobody notices until the invitations have
  | already gone out.
  |
  | Development therefore falls back to localhost, but production refuses to
  | boot without it. A missing APP_URL cannot be allowed to degrade quietly
  | into "http://localhost:3333" on a public server.
  |
  */
  APP_URL: (key, value) => {
    const isProduction = process.env.NODE_ENV === 'production'
    const trimmed = value?.trim()

    if (!trimmed) {
      if (isProduction) {
        throw new Error(
          `Missing environment variable "${key}". It is required when NODE_ENV=production, because invitation, password-reset and onboarding emails build their links from it — without it they would point at http://localhost:3333 and reach nobody. Set it to this application's public base URL, e.g. https://example.com`
        )
      }

      return 'http://localhost:3333'
    }

    let parsed: URL
    try {
      parsed = new URL(trimmed)
    } catch {
      throw new Error(
        `Invalid environment variable "${key}". Expected an absolute URL such as https://example.com, received "${trimmed}".`
      )
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(
        `Invalid environment variable "${key}". Expected an http or https URL, received "${trimmed}".`
      )
    }

    /**
     * Callers concatenate paths onto this value, so a trailing slash would
     * produce links like "https://example.com//register-invite".
     */
    return trimmed.replace(/\/+$/, '')
  },
})
