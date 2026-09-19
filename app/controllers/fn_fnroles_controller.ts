import FnFnrole from '#models/fn_fnrole'
import Roletaskset from '#models/roletaskset'
import FnRole from '#models/fn_role'
import Fn from '#models/fn'
import Loc from '#models/loc'
import Business from '#models/business'
import AccessPolicy from '#models/access_policy'
import AppRole from '#models/app_role'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class FnFnrolesController {
  async index({ response, auth }: HttpContext) {
    const user = auth.user!
    const filter = await this.getAccessFilterForUser(user)

    // If filter returns an explicit empty set, return no results
    if (filter && filter.allowedPairs.length === 0) {
      return response.ok({ data: [] })
    }

    let query = FnFnrole.query().orderBy([
      { column: 'fnid', order: 'asc' },
      { column: 'roleno', order: 'asc' },
    ])

    if (filter) {
      query = query.where((builder) => {
        for (const pair of filter.allowedPairs) {
          builder.orWhere((sub) => {
            sub.where('fnid', pair.fnid).where('roleno', pair.roleno)
          })
        }
      })
    }

    const fnfnroles = await query
    return response.ok({ data: fnfnroles })
  }

  async show({ params, response, auth }: HttpContext) {
    const { fnid, roleno } = params
    const user = auth.user!
    const filter = await this.getAccessFilterForUser(user)

    if (filter && !this.isPairAllowed(filter.allowedPairs, Number(fnid), Number(roleno))) {
      return response.forbidden({ message: 'You are not allowed to view this Function Role' })
    }

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

  /**
   * Returns allowed (fnid, roleno) pairs based on access policy, or null if no restriction.
   */
  private async getAccessFilterForUser(
    user: User
  ): Promise<{ allowedPairs: { fnid: number; roleno: number }[] } | null> {
    const role = user.approleId ? await AppRole.find(user.approleId) : null

    if (role?.rName === 'org_admin') {
      return this.getCompanyFilter(user.coId)
    }

    return this.getAccessFilter(user.fnroleId)
  }

  private async getCompanyFilter(
    coId: number | null
  ): Promise<{ allowedPairs: { fnid: number; roleno: number }[] }> {
    if (!coId) {
      return { allowedPairs: [] }
    }

    const fnRoles = await FnRole.query().whereHas('fn', (fnQuery) => {
      fnQuery.whereHas('loc', (locQuery) => {
        locQuery.whereHas('business', (businessQuery) => {
          businessQuery.where('coId', coId)
        })
      })
    })

    return {
      allowedPairs: fnRoles.map((r) => ({ fnid: r.fnid, roleno: r.roleno })),
    }
  }

  private async getAccessFilter(
    fnroleId: number | null
  ): Promise<{ allowedPairs: { fnid: number; roleno: number }[] } | null> {
    if (!fnroleId) return null

    const userFnRole = await FnRole.query()
      .where('id', fnroleId)
      .preload('fn', (q) => q.preload('loc', (q2) => q2.preload('business')))
      .preload('wlevel')
      .first()

    if (!userFnRole || !userFnRole.fn) return null

    const userFn = userFnRole.fn
    const userLoc = userFn.loc
    const userBusiness = userLoc?.business
    const coId = userBusiness?.coId

    if (!coId) return null

    const policy = await AccessPolicy.findBy('coId', coId)
    if (!policy) return null // No policy = no restriction

    // Determine allowed fnids based on function_scope
    let fnids: number[]
    switch (policy.functionScope) {
      case 'same_function':
        fnids = [userFn.id]
        break
      case 'same_location':
        fnids = (await Fn.query().where('locId', userFn.locId)).map((f) => f.id)
        break
      case 'same_business': {
        const locs = await Loc.query().where('businessId', userLoc.businessId)
        const locIds = locs.map((l) => l.id)
        fnids = (await Fn.query().whereIn('locId', locIds)).map((f) => f.id)
        break
      }
      case 'same_company': {
        const businesses = await Business.query().where('coId', coId)
        const bizIds = businesses.map((b) => b.id)
        const locs = await Loc.query().whereIn('businessId', bizIds)
        const locIds = locs.map((l) => l.id)
        fnids = (await Fn.query().whereIn('locId', locIds)).map((f) => f.id)
        break
      }
    }

    // Get all fn_roles for the allowed functions
    const fnRoles = await FnRole.query().whereIn('fnid', fnids).preload('wlevel')

    // Filter by level restriction if set
    let allowedPairs: { fnid: number; roleno: number }[]
    if (policy.levelRestriction !== null && userFnRole.wlevel) {
      const maxOrd = userFnRole.wlevel.ord + policy.levelRestriction
      allowedPairs = fnRoles
        .filter((r) => r.wlevel && r.wlevel.ord <= maxOrd)
        .map((r) => ({ fnid: r.fnid, roleno: r.roleno }))
    } else {
      allowedPairs = fnRoles.map((r) => ({ fnid: r.fnid, roleno: r.roleno }))
    }

    return { allowedPairs }
  }

  private isPairAllowed(
    allowedPairs: { fnid: number; roleno: number }[],
    fnid: number,
    roleno: number
  ): boolean {
    return allowedPairs.some((pair) => pair.fnid === fnid && pair.roleno === roleno)
  }
}
