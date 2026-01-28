import Roleskill from '#models/roleskill'
import KsDefinition from '#models/ks_definition'
import type { HttpContext } from '@adonisjs/core/http'

export default class RoleskillsController {
  async index({ response }: HttpContext) {
    // Get distinct roles from roleskills table
    const roleskills = await Roleskill.query()
      .distinct('fnid', 'roleno', 'fn_name', 'role_name')
      .orderBy([
        { column: 'fnid', order: 'asc' },
        { column: 'roleno', order: 'asc' },
      ])
    return response.ok({ data: roleskills })
  }

  async show({ params, response }: HttpContext) {
    const { fnid, roleno } = params

    const roleskill = await Roleskill.query()
      .where('fnid', fnid)
      .where('roleno', roleno)
      .firstOrFail()

    const ksdefinitions = await KsDefinition.query()
      .where('fnid', fnid)
      .where('roleno', roleno)
      .orderBy('catid', 'asc')
      .orderBy('catord', 'asc')

    return response.ok({ data: { roleskill, ksdefinitions } })
  }
}
