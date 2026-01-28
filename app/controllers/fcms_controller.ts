import type { HttpContext } from '@adonisjs/core/http'

export default class FcmsController {
  async index({ response }: HttpContext) {
    const data = { message: 'Home page data' }
    return response.ok({ data })
  }
}
