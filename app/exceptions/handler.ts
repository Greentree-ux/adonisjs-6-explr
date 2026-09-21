import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages would render Edge templates for certain error codes. This
   * application has no view layer — the frontend is an Angular SPA served as
   * static files and the API returns JSON (see `handle` below) — so there are
   * no templates to render and rendering is left off.
   */
  protected renderStatusPages = false

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    // For API routes, always return JSON responses instead of HTML
    if (ctx.request.url().startsWith('/api')) {
      const err = error as { status?: number; message?: string; messages?: unknown }
      const status = err.status || 500

      // Log the error for debugging (only visible in server terminal)
      console.error('API Error:', err)

      // Return a generic error message to the client
      // Never expose internal error details to the frontend
      return ctx.response.status(status).json({
        message: status === 422 ? 'Validation failed' : 'An error occurred',
        ...(app.inProduction ? {} : { errors: err.messages }),
      })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
