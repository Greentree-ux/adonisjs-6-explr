import FnFnrole from '#models/fn_fnrole'

import type { HttpContext } from '@adonisjs/core/http'

export default class FnFnrolesController {
  async index({ view }: HttpContext) {
    const fnfnroles = await FnFnrole.query().orderBy([
      { column: 'fnid', order: 'asc' },
      { column: 'roleno', order: 'asc' },
    ])
    return view.render('pages/fnfnroles/index', { fnfnroles })
  }
  async show({ params, view }: HttpContext) {
    const { fnid, roleno } = params
    const fnfnrole = await FnFnrole.query()
      .where('fnid', fnid)
      .where('roleno', roleno)
      .firstOrFail()

    const roletasksets = await fnfnrole
      .related('roletasksetsByFnid')
      .query()
      .where('roleno', roleno)
      .orderBy('subfnid', 'asc')
      .orderBy('sub2fnord', 'asc')
    return await view.render('pages/fnfnroles/show', { fnfnrole, roletasksets })
  }
}
