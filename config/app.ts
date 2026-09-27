import env from '#start/env'
import proxyAddr from 'proxy-addr'
import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/core/http'

/**
 * The app key is used for encrypting cookies, generating signed URLs,
 * and by the "encryption" module.
 *
 * The encryption module will fail to decrypt data if the key is lost or
 * changed. Therefore it is recommended to keep the app key secure.
 */
export const appKey = new Secret(env.get('APP_KEY'))

/**
 * The configuration settings used by the HTTP server
 */
/**
 * Which peer addresses may be believed when they send X-Forwarded-* headers.
 *
 * Adonis defaults to "loopback", which is correct when nothing sits in front of
 * the app, and wrong the moment a reverse proxy runs as a separate container:
 * the peer address is then a private network address, not 127.0.0.1, so the
 * X-Forwarded-Proto header is ignored and `request.protocol()` reports "http"
 * even though the client connected over HTTPS.
 *
 * That matters here because the cookie config below and config/session.ts both
 * set `secure: app.inProduction`. A misdetected protocol combined with a secure
 * cookie produces a login that appears to succeed and then bounces straight
 * back to the login form, with nothing in the logs to explain it.
 *
 * The default keeps today's local behaviour exactly. Behind a containerised
 * proxy set TRUST_PROXY=loopback,uniquelocal — "uniquelocal" covers the RFC1918
 * ranges Docker networks use. Named ranges ("loopback", "linklocal",
 * "uniquelocal"), bare addresses and CIDR blocks are all accepted.
 *
 * The list is compiled here rather than handed to Adonis as a string, because
 * Adonis passes a string straight to proxyAddr.compile(), which treats the whole
 * thing as ONE trust value — so "loopback,uniquelocal", the obvious value to
 * write for a container deployment, throws at boot. Splitting first makes the
 * comma-separated form work the way it does in every other framework.
 */
const trustProxyValues = env
  .get('TRUST_PROXY', 'loopback')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

if (trustProxyValues.length === 0) {
  throw new Error(
    'TRUST_PROXY is set but empty. Remove it to keep the default of "loopback", or give it a value such as "loopback,uniquelocal".'
  )
}

let trustProxy: (address: string, distance: number) => boolean
try {
  trustProxy = proxyAddr.compile(trustProxyValues)
} catch (error) {
  throw new Error(
    `Invalid TRUST_PROXY value "${trustProxyValues.join(',')}". Expected a comma-separated list of "loopback", "linklocal", "uniquelocal", IP addresses or CIDR blocks.`,
    { cause: error }
  )
}

export const http = defineConfig({
  generateRequestId: true,
  allowMethodSpoofing: false,
  trustProxy,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: false,

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
})
