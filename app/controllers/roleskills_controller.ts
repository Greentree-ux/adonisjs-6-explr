import FnFnrole from '#models/fn_fnrole'
import type { HttpContext } from '@adonisjs/core/http'

export default class RoleskillsController {
  async index({ view }: HttpContext) {
    const roleskills = await FnFnrole.query().orderBy([
      { column: 'fnid', order: 'asc' },
      { column: 'roleno', order: 'asc' },
    ])
    return view.render('pages/roleskills/index', { roleskills })
  }
  async show({ params, view }: HttpContext) {
    const { fnid, roleno } = params
    const fnfnrole = await FnFnrole.query()
      .where('fnid', fnid)
      .where('roleno', roleno)
      .firstOrFail()

    const roleskills = await fnfnrole
      .related('roleskillsByFnid')
      .query()
      .where('roleno', roleno)
      .orderBy('catseq', 'asc')
      .orderBy('catord', 'asc')
    return await view.render('pages/roleskills/show', { fnfnrole, roleskills })
  }
}
