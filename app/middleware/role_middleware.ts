import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import AppRole from '#models/app_role'

/**
 * Role middleware checks that the authenticated user has one of the
 * specified application roles. Attach after auth middleware.
 *
 * Usage in routes: .use(middleware.role({ roles: ['sys_admin', 'org_admin'] }))
 */
export default class RoleMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { roles: string[] }
  ) {
    const user = ctx.auth.user
    if (!user) {
      return ctx.response.unauthorized({ message: 'Not authenticated' })
    }

    if (!user.approleId) {
      return ctx.response.forbidden({ message: 'Access denied: no role assigned' })
    }

    const appRole = await AppRole.find(user.approleId)
    if (!appRole || !options.roles.includes(appRole.rName)) {
      return ctx.response.forbidden({ message: 'Access denied: insufficient role' })
    }

    return next()
  }
}
