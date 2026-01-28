import FnFnrole from '#models/fn_fnrole'
import Roletaskset from '#models/roletaskset'
import type { HttpContext } from '@adonisjs/core/http'

export default class FnFnrolesController {
  async index({ response }: HttpContext) {
    const fnfnroles = await FnFnrole.query().orderBy([
      { column: 'fnid', order: 'asc' },
      { column: 'roleno', order: 'asc' },
    ])
    return response.ok({ data: fnfnroles })
  }
  async show({ params, response }: HttpContext) {
    const { fnid, roleno } = params
    const fnfnrole = await FnFnrole.query()
      .where('fnid', fnid)
      .where('roleno', roleno)
      .firstOrFail()

    const roletasksets = await Roletaskset.query()
      .where('fnid', fnid)
      .where('roleno', roleno)
      .orderBy('subfnid', 'asc')
      .orderBy('sub2fnord', 'asc')
    return response.ok({ data: { fnfnrole, roletasksets } })
  }
}
