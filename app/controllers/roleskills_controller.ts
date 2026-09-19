import Roleskill from '#models/roleskill'
import FnRole from '#models/fn_role'
import Fn from '#models/fn'
import Loc from '#models/loc'
import Business from '#models/business'
import AccessPolicy from '#models/access_policy'
import Taskset from '#models/taskset'
import Roletaskset from '#models/roletaskset'
import AppRole from '#models/app_role'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

export default class RoleskillsController {
  async index({ response, auth }: HttpContext) {
    const user = auth.user!
    const filter = await this.getAccessFilterForUser(user)

    // If filter returns an explicit empty set, return no results
    if (filter && filter.allowedPairs.length === 0) {
      return response.ok({ data: [] })
    }

    let query = Roleskill.query()
      .distinct('fnid', 'roleno', 'fn_name', 'role_name')
      .orderBy([
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

    const roleskills = await query
    return response.ok({ data: roleskills })
  }

  async show({ params, response, auth }: HttpContext) {
    const { fnid, roleno } = params
    const user = auth.user!
    const filter = await this.getAccessFilterForUser(user)

    if (filter && !this.isPairAllowed(filter.allowedPairs, Number(fnid), Number(roleno))) {
      return response.forbidden({ message: 'You are not allowed to view these Role Skills' })
    }

    const roleskill = await Roleskill.query()
      .where('fnid', fnid)
      .where('roleno', roleno)
      .firstOrFail()

    const roleSkills = await Roleskill.query()
      .where('fnid', fnid)
      .where('roleno', roleno)
      .orderBy('catid', 'asc')
      .orderBy('catord', 'asc')
      .orderBy('ksid', 'asc')

    const uniqueRoleSkills = Array.from(new Map(roleSkills.map((skill) => [skill.ksid, skill])).values())

    type TaskskillMapRow = {
      taskid: number
      ksid01: number | null
      ksid02: number | null
      ksid03: number | null
      ksid04: number | null
      ksid05: number | null
      ksid06: number | null
      ksid07: number | null
      ksid08: number | null
      ksid09: number | null
      ksid10: number | null
      ksid11: number | null
      ksid12: number | null
    }

    const roleTasksets = await Roletaskset.query().where('fnid', fnid).where('roleno', roleno)

    const roleTasksetMeta = new Map(
      roleTasksets.map((item) => [
        `${item.subfnid}-${item.sub2fnord}-${item.taskset}`,
        { subfnName: item.subfn_name, subSubFnName: item.sub_sub_fn_name },
      ])
    )

    const roleTasksetRows = await Taskset.query().where('fnid', fnid).where('roleno', roleno)
    const tasksetById = new Map(roleTasksetRows.map((taskset) => [taskset.id, taskset]))

    const mappedRows: TaskskillMapRow[] =
      roleTasksetRows.length > 0
        ? await db
            .from('taskskill_maps')
            .whereIn(
              'taskid',
              roleTasksetRows.map((taskset) => taskset.id)
            )
            .select(
              'taskid',
              'ksid01',
              'ksid02',
              'ksid03',
              'ksid04',
              'ksid05',
              'ksid06',
              'ksid07',
              'ksid08',
              'ksid09',
              'ksid10',
              'ksid11',
              'ksid12'
            )
        : []

    const mappingStats = new Map<number, { tasksetMappingCount: number; mappedSubSubFnNames: Set<string> }>()

    for (const row of mappedRows) {
      const taskset = tasksetById.get(row.taskid)
      if (!taskset) {
        continue
      }

      const tasksetKey = `${taskset.subfnid}-${taskset.sub2fnord}-${taskset.taskset ?? ''}`
      const tasksetMeta = roleTasksetMeta.get(tasksetKey)
      const mappedSubSubFnName =
        tasksetMeta?.subSubFnName ??
        tasksetMeta?.subfnName ??
        `Sub-sub-function ${taskset.sub2fnord}`
      const mappedKsIds = Array.from(
        new Set(
          [
            row.ksid01,
            row.ksid02,
            row.ksid03,
            row.ksid04,
            row.ksid05,
            row.ksid06,
            row.ksid07,
            row.ksid08,
            row.ksid09,
            row.ksid10,
            row.ksid11,
            row.ksid12,
          ].filter((id): id is number => Boolean(id))
        )
      )

      for (const ksId of mappedKsIds) {
        const current = mappingStats.get(ksId) ?? {
          tasksetMappingCount: 0,
          mappedSubSubFnNames: new Set<string>(),
        }

        current.tasksetMappingCount += 1
        current.mappedSubSubFnNames.add(mappedSubSubFnName)
        mappingStats.set(ksId, current)
      }
    }

    const ksdefinitions = uniqueRoleSkills.map((skill) => {
      const mapping = mappingStats.get(skill.ksid)

      return {
        id: skill.ksid,
        fnid: skill.fnid,
        catid: skill.catid,
        catord: skill.catord,
        roleno: skill.roleno,
        knowledgeSkillType: skill.k_ss_gs,
        ksCategory: skill.kscategory,
        ksName: skill.ksname,
        ksdefinition: skill.ksdefinition,
        tasksetMappingCount: mapping?.tasksetMappingCount ?? 0,
        mappedSubSubFnNames: Array.from(mapping?.mappedSubSubFnNames ?? []).sort((a, b) =>
          a.localeCompare(b)
        ),
      }
    })

    return response.ok({ data: { roleskill, ksdefinitions } })
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
    if (!policy) return null

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

    const fnRoles = await FnRole.query().whereIn('fnid', fnids).preload('wlevel')

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
