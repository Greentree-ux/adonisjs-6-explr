import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Blocks all API access when the user's mustChangePassword flag is true,
 * except for the change-password and logout endpoints.
 */
export default class ForceChangePasswordMiddleware {
  private allowedPaths = ['/api/auth/change-password', '/api/auth/logout', '/api/auth/me']

  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (user?.mustChangePassword && !this.allowedPaths.includes(ctx.request.url())) {
      return ctx.response.forbidden({
        code: 'E_MUST_CHANGE_PASSWORD',
        message: 'You must change your password before continuing.',
      })
    }

    return next()
  }
}
