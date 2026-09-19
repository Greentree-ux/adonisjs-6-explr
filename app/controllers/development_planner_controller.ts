import type { HttpContext } from '@adonisjs/core/http'
import DevelopmentPlan from '#models/development_plan'
import DpFocusSkillsProficiency from '#models/dp_focus_skills_proficiency'
import DpTargetRole from '#models/dp_target_role'
import DpFocusSkillsTarget from '#models/dp_focus_skills_target'
import DpActionPlan from '#models/dp_action_plan'
import DpReminder from '#models/dp_reminder'
import DpOtherSkill from '#models/dp_other_skill'
import AssessmentSubmission from '#models/assessment_submission'
import User from '#models/user'
import FnRole from '#models/fn_role'
import Taskset from '#models/taskset'
import Roletaskset from '#models/roletaskset'
import Roleskill from '#models/roleskill'
import ReminderService from '#services/reminder_service'
import type { ReminderScheduleInput } from '#services/reminder_service'
import LearningPeriodService from '#services/learning_period_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

type AssessmentPayload = {
  subfunctions?: Array<{
    groups?: Array<{
      tasks?: Array<{
        taskKey?: string
        toDevelop?: boolean
      }>
    }>
  }>
}

export default class DevelopmentPlannerController {
  private readonly manualSkillTypeLabels = ['Knowledge', 'Situated Skill', 'General Skill'] as const
  private learningPeriodService = new LearningPeriodService()

  private readonly stageStatusValues = ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5'] as const

  private getCycleYear(): number {
    const now = DateTime.now()
    return now.month >= 4 ? now.year : now.year - 1
  }

  private normalizeKnowledgeSkillType(
    value: unknown
  ): (typeof this.manualSkillTypeLabels)[number] | null {
    const raw = String(value ?? '')
      .trim()
      .toLowerCase()

    if (raw === 'k' || raw.startsWith('knowledge')) {
      return 'Knowledge'
    }

    if (
      raw === 'ss' ||
      raw === 's' ||
      raw.includes('situated') ||
      raw.includes('skill - situated')
    ) {
      return 'Situated Skill'
    }

    if (raw === 'gs' || raw === 'g' || raw.includes('general') || raw.includes('skill - general')) {
      return 'General Skill'
    }

    return null
  }

  private normalizeAddressedSkillKey(value: unknown): string | null {
    if (typeof value === 'number') {
      return Number.isInteger(value) && value > 0 ? String(value) : null
    }

    if (typeof value !== 'string') {
      return null
    }

    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed) || /^other:\d+$/.test(trimmed)) {
      return trimmed
    }

    return null
  }

  private normalizeAddressedSkillKeys(values: unknown): string[] {
    if (!Array.isArray(values)) {
      return []
    }

    const normalizedValues: string[] = []

    for (const value of values) {
      const normalizedValue = this.normalizeAddressedSkillKey(value)
      if (normalizedValue) {
        normalizedValues.push(normalizedValue)
      }
    }

    return Array.from(new Set(normalizedValues))
  }

  private buildManualSkillDisplayLabel(skill: { ksName: string; ksDefinition: string }) {
    return `${skill.ksName}: ${skill.ksDefinition}`
  }

  private buildRoleSkillDisplayLabel(skill: { ksName: string; ksDefinition: string | null }) {
    const name = skill.ksName.trim()
    const definition = String(skill.ksDefinition ?? '').trim()

    if (!definition) {
      return name
    }

    return `${name}: ${definition}`
  }

  private getStageStatus(stage: number) {
    if (!Number.isInteger(stage) || stage < 1 || stage > 5) {
      throw new Error('Invalid stage')
    }

    return this.stageStatusValues[stage - 1]
  }

  private syncPlanStateAfterStageSave(
    plan: DevelopmentPlan,
    stage: number,
    isManagerEdit: boolean
  ) {
    const stageStatus = this.getStageStatus(stage)

    if (isManagerEdit) {
      plan.managerStatus = stageStatus
      plan.managerSubmittedAt = null
      return
    }

    if (plan.userStatus === 'completed' || plan.userSubmittedAt) {
      plan.userStatus = 'completed'
      plan.managerStatus = stageStatus
      plan.managerSubmittedAt = null
      return
    }

    plan.userStatus = stageStatus
  }

  private async getOtherSkillCategoryOptions() {
    const rows = await db
      .from('ks_cats')
      .select('k_ss_gs', 'kscategory', 'catseq')
      .orderBy('k_ss_gs', 'asc')
      .orderBy('catseq', 'asc')
      .orderBy('kscategory', 'asc')

    const options = new Map<string, { knowledgeSkillType: string; ksCategory: string }>()

    for (const row of rows) {
      const knowledgeSkillType = this.normalizeKnowledgeSkillType(row.k_ss_gs)
      if (!knowledgeSkillType || !row.kscategory) {
        continue
      }

      options.set(`${knowledgeSkillType}::${row.kscategory}`, {
        knowledgeSkillType,
        ksCategory: row.kscategory,
      })
    }

    return Array.from(options.values())
  }

  private async getStage5AvailableFocusSkills(plan: DevelopmentPlan) {
    const [proficiencyFocusSkills, targetFocusSkills, otherSkills] = await Promise.all([
      DpFocusSkillsProficiency.query().where('plan_id', plan.id).preload('ksDefinition'),
      DpFocusSkillsTarget.query().where('plan_id', plan.id).preload('ksDefinition'),
      DpOtherSkill.query().where('plan_id', plan.id).orderBy('sequence', 'asc'),
    ])

    const roleSkillDefinitionIds = Array.from(
      new Set([
        ...proficiencyFocusSkills.map((skill) => skill.ksDefinition.id),
        ...targetFocusSkills.map((skill) => skill.ksDefinition.id),
      ])
    )

    const roleSkillMetadataRows = roleSkillDefinitionIds.length
      ? await db
          .from('ks_definitions as kd')
          .join('ks_frameworks as kf', (join) => {
            join
              .on('kd.fnid', '=', 'kf.fnid')
              .andOn('kd.catid', '=', 'kf.catid')
              .andOn('kd.catord', '=', 'kf.catord')
          })
          .join('ks_cats as kc', 'kf.catid', 'kc.id')
          .select(
            'kd.id as ksid',
            'kf.ksname as ks_name',
            'kc.k_ss_gs as knowledge_skill_type'
          )
          .whereIn('kd.id', roleSkillDefinitionIds)
      : []

    const roleSkillMetadataById = new Map(
      roleSkillMetadataRows.map((row) => [Number(row.ksid), row])
    )

    const user = await User.find(plan.userId)
    const currentRole = user?.fnroleId
      ? await FnRole.query().where('id', user.fnroleId).preload('fn').first()
      : null
    const managerUser = user?.mgrId
      ? ((await User.query().where('empId', user.mgrId).first()) ?? (await User.find(user.mgrId)))
      : null
    const managerRole = managerUser?.fnroleId
      ? await FnRole.query().where('id', managerUser.fnroleId).preload('fn').first()
      : null
    const managerRoleKey = managerRole ? `${managerRole.fnid}_${managerRole.roleno}` : null

    const currentRoleLabel = currentRole
      ? `${currentRole.fn?.fnName ?? `Function ${currentRole.fnid}`} - ${currentRole.role_name}`
      : 'Role Proficiency'

    const targetRoles = await DpTargetRole.query().where('plan_id', plan.id)
    const targetRoleLabels = new Map<string, string>()

    for (const targetRole of targetRoles) {
      const role = await FnRole.query()
        .where('fnid', targetRole.fnid)
        .where('roleno', targetRole.roleno)
        .preload('fn')
        .first()

      targetRoleLabels.set(
        `${targetRole.fnid}_${targetRole.roleno}`,
        role
          ? `${role.fn?.fnName ?? `Function ${targetRole.fnid}`} - ${role.role_name}`
          : `Function ${targetRole.fnid} - Role ${targetRole.roleno}`
      )
    }

    return [
      ...proficiencyFocusSkills.map((skill) => {
        const metadata = roleSkillMetadataById.get(skill.ksDefinition.id)

        return {
          id: String(skill.ksDefinition.id),
          ksName: metadata?.ks_name ?? null,
          ksdefinition: skill.ksDefinition.ksdefinition,
          displayLabel: metadata?.ks_name
            ? this.buildRoleSkillDisplayLabel({
                ksName: metadata.ks_name,
                ksDefinition: skill.ksDefinition.ksdefinition,
              })
            : (skill.ksDefinition.ksdefinition ?? null),
          knowledgeSkillType: metadata?.knowledge_skill_type ?? null,
          roleLabel: currentRoleLabel,
          rolePriority: 0,
        }
      }),
      ...targetFocusSkills.map((skill) => {
        const metadata = roleSkillMetadataById.get(skill.ksDefinition.id)

        return {
          id: String(skill.ksDefinition.id),
          ksName: metadata?.ks_name ?? null,
          ksdefinition: skill.ksDefinition.ksdefinition,
          displayLabel: metadata?.ks_name
            ? this.buildRoleSkillDisplayLabel({
                ksName: metadata.ks_name,
                ksDefinition: skill.ksDefinition.ksdefinition,
              })
            : (skill.ksDefinition.ksdefinition ?? null),
          knowledgeSkillType: metadata?.knowledge_skill_type ?? null,
          rolePriority:
            skill.sourceFnid !== null && skill.sourceRoleno !== null
              ? `${skill.sourceFnid}_${skill.sourceRoleno}` === managerRoleKey
                ? 1
                : 2
              : 2,
          roleLabel:
            skill.sourceFnid !== null && skill.sourceRoleno !== null
              ? (targetRoleLabels.get(`${skill.sourceFnid}_${skill.sourceRoleno}`) ?? null)
              : null,
        }
      }),
      ...otherSkills.map((skill) => ({
        id: `other:${skill.id}`,
        ksName: skill.ksName,
        ksdefinition: skill.ksDefinition,
        displayLabel: this.buildManualSkillDisplayLabel(skill),
        knowledgeSkillType: skill.knowledgeSkillType,
        roleLabel: 'Other Knowledge/Skills',
        rolePriority: 3,
      })),
    ]
  }

  /**
   * GET /api/development-plan/team-members
   * Lists team members who have submitted development plans (for dropdown)
   */
  async getTeamMembers({ auth, response }: HttpContext) {
    const currentUser = auth.user!
    const currentPeriod = await this.learningPeriodService.getCurrentPeriodForUser(currentUser)

    if (!currentPeriod) {
      return response.ok({ data: [] })
    }

    const teamMembers = await User.query()
      .where('mgrId', currentUser.empId)
      .select('id', 'firstName', 'lastName')
      .orderBy('firstName', 'asc')

    const plans = await DevelopmentPlan.query()
      .where('learning_period_id', currentPeriod.id)
      .whereIn(
        'user_id',
        teamMembers.map((member) => member.id)
      )

    const membersReadyForManagerReview = new Set(
      plans
        .filter((plan) => ['stage_3', 'stage_4', 'stage_5', 'completed'].includes(plan.userStatus))
        .map((plan) => plan.userId)
    )

    return response.ok({
      data: teamMembers
        .filter((member) => membersReadyForManagerReview.has(member.id))
        .map((member) => ({
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
        })),
    })
  }

  /**
   * GET /api/development-plan/stage/:stage
   * Fetch development plan data for a specific stage
   * Query param: userId (optional, defaults to self)
   * Stages: 1 (Focus Skills for Role Proficiency)
   *         2 (Target Role Selection)
   *         3 (Focus Skills for Target Roles)
   *         4 (Consolidated View)
   *         5 (Development Planner / Action Plans)
   */
  async getStage({ auth, request, response, params }: HttpContext) {
    const currentUser = auth.user!
    const stage = Number.parseInt(params.stage)
    const userId = request.input('userId')
      ? Number.parseInt(request.input('userId'))
      : currentUser.id
    const subjectUser = userId === currentUser.id ? currentUser : await User.find(userId)

    // Authorization: user can view own plans, manager can view direct reports
    if (userId !== currentUser.id) {
      if (!subjectUser || subjectUser.mgrId !== currentUser.empId) {
        return response.forbidden({ error: 'Access denied' })
      }
    }

    if (!subjectUser) {
      return response.notFound({ error: 'User not found' })
    }

    const currentPeriod = await this.learningPeriodService.getCurrentPeriodForUser(subjectUser)
    if (!currentPeriod) {
      return response.badRequest({ error: 'No active performance-learning period is configured for this company' })
    }

    const cycleYear = this.getCycleYear()
    let plan = await DevelopmentPlan.query()
      .where('user_id', userId)
      .where('learning_period_id', currentPeriod.id)
      .first()

    if (!plan) {
      plan = await DevelopmentPlan.create({
        userId,
        cycleYear,
        learningPeriodId: currentPeriod.id,
        userStatus: 'stage_1',
        managerStatus: 'notSubmitted',
      })
    }

    // Return stage-specific data
    console.log(`[DevPlanner] getStage: stage=${stage} userId=${userId} planId=${plan.id}`)
    try {
      switch (stage) {
        case 1:
          return await this.getStage1Data(plan, response)
        case 2:
          return await this.getStage2Data(plan, response)
        case 3:
          return await this.getStage3Data(plan, response)
        case 4:
          return await this.getStage4Data(plan, response)
        case 5:
          return await this.getStage5Data(plan, response)
        default:
          return response.badRequest({ error: 'Invalid stage' })
      }
    } catch (err: any) {
      console.error(`[DevPlanner] getStage UNHANDLED ERROR stage=${stage}:`, err?.message ?? err)
      return response.internalServerError({ error: err?.message ?? 'Internal server error' })
    }
  }

  /**
   * Stage 1: Focus Skills for Role Proficiency
   * Returns the full knowledge/skill list for the current role,
   * annotated with taskset mapping counts and highlighting for
   * skills mapped to Assessment tasksets marked as "To Develop".
   */
  private async getStage1Data(plan: DevelopmentPlan, response: HttpContext['response']) {
    const user = await User.find(plan.userId)
    if (!user?.fnroleId) {
      return response.ok({ data: null, message: 'No role assigned' })
    }

    const fnRole = await FnRole.find(user.fnroleId)
    if (!fnRole) {
      return response.ok({ data: null, message: 'Invalid role' })
    }

    const assessmentSubmission = await AssessmentSubmission.query()
      .where('subject_user_id', user.id)
      .where('learning_period_id', plan.learningPeriodId)
      .first()

    const payload = (assessmentSubmission?.payload ?? {}) as AssessmentPayload
    const toDevelopTaskKeys = new Set<string>()
    const subfunctions = payload.subfunctions ?? []
    for (const subfn of subfunctions) {
      const groups = subfn.groups ?? []
      for (const group of groups) {
        const tasks = group.tasks ?? []
        for (const task of tasks) {
          if (task?.toDevelop && task.taskKey) {
            toDevelopTaskKeys.add(task.taskKey)
          }
        }
      }
    }

    const parsedTaskParts: Array<{ subfnid: number; sub2fnord: number; taskset: string }> = []
    for (const key of toDevelopTaskKeys) {
      const match = key.match(/^(\d+)-(\d+)-([\s\S]+)$/)
      if (!match) {
        continue
      }
      parsedTaskParts.push({
        subfnid: Number(match[1]),
        sub2fnord: Number(match[2]),
        taskset: match[3],
      })
    }

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

    const roleTasksets = await Roletaskset.query()
      .where('fnid', fnRole.fnid)
      .where('roleno', fnRole.roleno)

    const roleTasksetMeta = new Map(
      roleTasksets.map((item) => [
        `${item.subfnid}-${item.sub2fnord}-${item.taskset}`,
        { subfnName: item.subfn_name, subSubFnName: item.sub_sub_fn_name },
      ])
    )

    const roleTasksetRows = await Taskset.query()
      .where('fnid', fnRole.fnid)
      .where('roleno', fnRole.roleno)

    const tasksetById = new Map(roleTasksetRows.map((taskset) => [taskset.id, taskset]))
    const tasksetByKey = new Map(
      roleTasksetRows.map((taskset) => [
        `${taskset.subfnid}-${taskset.sub2fnord}-${taskset.taskset ?? ''}`,
        taskset,
      ])
    )
    const toDevelopTaskIds = new Set<number>()

    for (const part of parsedTaskParts) {
      const match = tasksetByKey.get(`${part.subfnid}-${part.sub2fnord}-${part.taskset}`)
      if (match) {
        toDevelopTaskIds.add(match.id)
      }
    }

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

    const mappingStats = new Map<
      number,
      { tasksetMappingCount: number; mappedSubSubFnNames: Set<string>; isMappedToDevelop: boolean }
    >()

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
          isMappedToDevelop: false,
        }

        current.tasksetMappingCount += 1
        current.mappedSubSubFnNames.add(mappedSubSubFnName)
        if (toDevelopTaskIds.has(taskset.id)) {
          current.isMappedToDevelop = true
        }
        mappingStats.set(ksId, current)
      }
    }

    const roleSkills = await Roleskill.query()
      .where('fnid', fnRole.fnid)
      .where('roleno', fnRole.roleno)
      .orderBy('catid', 'asc')
      .orderBy('catord', 'asc')
      .orderBy('ksid', 'asc')

    const uniqueRoleSkills = Array.from(
      new Map(roleSkills.map((skill) => [skill.ksid, skill])).values()
    )

    const availableSkills = uniqueRoleSkills.map((skill) => {
      const mapping = mappingStats.get(skill.ksid)

      return {
        ksId: skill.ksid,
        knowledgeSkillType: skill.k_ss_gs,
        ksCategory: skill.kscategory,
        ksName: skill.ksname,
        ksDefinition: skill.ksdefinition,
        tasksetMappingCount: mapping?.tasksetMappingCount ?? 0,
        mappedSubSubFnNames: Array.from(mapping?.mappedSubSubFnNames ?? []).sort((a, b) =>
          a.localeCompare(b)
        ),
        isMappedToDevelop: mapping?.isMappedToDevelop ?? false,
      }
    })

    const focusSkills = await DpFocusSkillsProficiency.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')

    const selectedSkillIds = focusSkills.map((row) => row.ksId)

    return response.ok({
      data: {
        plan: plan.serialize(),
        availableSkills,
        selectedSkillIds,
        maxSelectableSkills: 3,
      },
    })
  }

  /**
   * Stage 2: Target Role Selection
   * Lists manager's role and same-level roles
   */
  private async getStage2Data(plan: DevelopmentPlan, response: HttpContext['response']) {
    console.log(`[DevPlanner] getStage2: planId=${plan.id} userId=${plan.userId}`)
    const user = await User.find(plan.userId)
    if (!user?.fnroleId) {
      return response.ok({ data: null, message: 'No role assigned' })
    }
    console.log(
      `[DevPlanner] getStage2: user found, fnroleId=${user.fnroleId}, mgrId=${user.mgrId}`
    )

    const currentRole = await FnRole.find(user.fnroleId)
    if (!currentRole) {
      return response.ok({ data: null, message: 'Invalid role' })
    }
    console.log(
      `[DevPlanner] getStage2: currentRole=${currentRole.fnid}_${currentRole.roleno} wlevelid=${currentRole.wlevelid}`
    )

    const currentRoleKey = `${currentRole.fnid}_${currentRole.roleno}`
    const availableRoleMap = new Map<
      string,
      {
        roleKey: string
        relationType: 'manager' | 'lateral'
        fnid: number
        roleno: number
        functionName: string
        roleName: string
      }
    >()

    // Manager role (if available and not same as current role)
    if (user.mgrId) {
      console.log(`[DevPlanner] getStage2: resolving manager mgrId=${user.mgrId}`)
      const managerByEmpId = await User.query().where('empId', user.mgrId).first()
      const managerById = await User.find(user.mgrId)
      const manager = managerByEmpId ?? managerById
      console.log(
        `[DevPlanner] getStage2: manager resolved id=${manager?.id} fnroleId=${manager?.fnroleId}`
      )
      if (manager?.fnroleId) {
        const managerRole = await FnRole.query().where('id', manager.fnroleId).preload('fn').first()
        if (managerRole) {
          const roleKey = `${managerRole.fnid}_${managerRole.roleno}`
          if (roleKey !== currentRoleKey) {
            availableRoleMap.set(roleKey, {
              roleKey,
              relationType: 'manager',
              fnid: managerRole.fnid,
              roleno: managerRole.roleno,
              functionName: managerRole.fn?.fnName ?? `Function ${managerRole.fnid}`,
              roleName: managerRole.role_name,
            })
          }
        }
      }
    }

    // Lateral roles: same work level as current user role (excluding current role)
    console.log(
      `[DevPlanner] getStage2: querying lateral roles for wlevelid=${currentRole.wlevelid}`
    )
    const lateralRoles = await FnRole.query().where('wlevelid', currentRole.wlevelid).preload('fn')
    console.log(`[DevPlanner] getStage2: found ${lateralRoles.length} lateral roles`)
    for (const role of lateralRoles) {
      const roleKey = `${role.fnid}_${role.roleno}`
      if (roleKey === currentRoleKey) {
        continue
      }
      if (!availableRoleMap.has(roleKey)) {
        availableRoleMap.set(roleKey, {
          roleKey,
          relationType: 'lateral',
          fnid: role.fnid,
          roleno: role.roleno,
          functionName: role.fn?.fnName ?? `Function ${role.fnid}`,
          roleName: role.role_name,
        })
      }
    }

    const availableRoles = Array.from(availableRoleMap.values()).sort((a, b) => {
      if (a.relationType !== b.relationType) {
        return a.relationType === 'manager' ? -1 : 1
      }
      if (a.functionName !== b.functionName) {
        return a.functionName.localeCompare(b.functionName)
      }
      return a.roleName.localeCompare(b.roleName)
    })

    console.log(`[DevPlanner] getStage2: querying DpTargetRoles`)
    const targetRoles = await DpTargetRole.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')

    const selectedRoleIds = targetRoles.map((role) => `${role.fnid}_${role.roleno}`)
    console.log(
      `[DevPlanner] getStage2: returning ${availableRoles.length} roles, ${selectedRoleIds.length} selected`
    )

    return response.ok({
      data: {
        plan: plan.serialize(),
        availableRoles,
        selectedRoleIds,
        maxSelectableRoles: 2,
      },
    })
  }

  /**
   * Stage 3: Focus Skills for Target Roles
   * Lists KS for selected target roles
   */
  private async getStage3Data(plan: DevelopmentPlan, response: HttpContext['response']) {
    console.log(`[DevPlanner] getStage3: planId=${plan.id}`)
    const selectedTargetRoles = await DpTargetRole.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
    console.log(`[DevPlanner] getStage3: ${selectedTargetRoles.length} target roles found`)

    const availableSkills: Array<{
      roleKey: string
      roleLabel: string
      selectionKey: string
      ksId: number
      knowledgeSkillType: string
      ksCategory: string
      ksName: string
      ksDefinition: string
    }> = []

    for (const targetRole of selectedTargetRoles) {
      console.log(
        `[DevPlanner] getStage3: querying Roleskill for fnid=${targetRole.fnid} roleno=${targetRole.roleno}`
      )
      const skills = await Roleskill.query()
        .where('fnid', targetRole.fnid)
        .where('roleno', targetRole.roleno)
        .orderBy('catid', 'asc')
        .orderBy('catord', 'asc')
      console.log(
        `[DevPlanner] getStage3: found ${skills.length} skills for role ${targetRole.fnid}_${targetRole.roleno}`
      )

      for (const skill of skills) {
        availableSkills.push({
          roleKey: `${targetRole.fnid}_${targetRole.roleno}`,
          roleLabel: `${skill.fn_name} - ${skill.role_name}`,
          selectionKey: `${targetRole.fnid}_${targetRole.roleno}:${skill.ksid}`,
          ksId: skill.ksid,
          knowledgeSkillType: skill.k_ss_gs,
          ksCategory: skill.kscategory,
          ksName: skill.ksname,
          ksDefinition: skill.ksdefinition,
        })
      }
    }

    const focusSkills = await DpFocusSkillsTarget.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')

    const selectedSkills = focusSkills.map((row) => ({
      ksId: row.ksId,
      roleKey:
        row.sourceFnid !== null && row.sourceRoleno !== null
          ? `${row.sourceFnid}_${row.sourceRoleno}`
          : null,
      selectionKey:
        row.sourceFnid !== null && row.sourceRoleno !== null
          ? `${row.sourceFnid}_${row.sourceRoleno}:${row.ksId}`
          : `${row.ksId}`,
    }))

    return response.ok({
      data: {
        plan: plan.serialize(),
        selectedTargetRoles: selectedTargetRoles.map((role) => ({
          roleKey: `${role.fnid}_${role.roleno}`,
          fnid: role.fnid,
          roleno: role.roleno,
        })),
        availableSkills,
        selectedSkills,
        maxSelectableSkills: 3,
      },
    })
  }

  /**
   * Stage 4: Consolidated View
   * Read-only display of all selected focus skills
   */
  private async getStage4Data(plan: DevelopmentPlan, response: HttpContext['response']) {
    const proficiencySkills = await DpFocusSkillsProficiency.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
      .preload('ksDefinition')

    const targetSkills = await DpFocusSkillsTarget.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
      .preload('ksDefinition')

    const targetRoles = await DpTargetRole.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
    const otherSkills = await DpOtherSkill.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
    const otherSkillCategoryOptions = await this.getOtherSkillCategoryOptions()

    const user = await User.find(plan.userId)
    const currentRole = user?.fnroleId
      ? await FnRole.query().where('id', user.fnroleId).preload('fn').first()
      : null

    const roleProficiencyDetails =
      currentRole && proficiencySkills.length > 0
        ? await this.getRoleSkillDetails(
            currentRole.fnid,
            currentRole.roleno,
            proficiencySkills.map((item) => item.ksId)
          )
        : []

    const futureRolePrepGroups: Array<{
      roleKey: string
      roleLabel: string
      skills: Array<{
        ksId: number
        knowledgeSkillType: string
        ksCategory: string
        ksName: string
        ksDefinition: string | null
      }>
    }> = []

    for (const targetRole of targetRoles) {
      const roleKey = `${targetRole.fnid}_${targetRole.roleno}`
      const groupSkills = targetSkills.filter(
        (skill) => skill.sourceFnid === targetRole.fnid && skill.sourceRoleno === targetRole.roleno
      )

      if (groupSkills.length === 0) {
        continue
      }

      const details = await this.getRoleSkillDetails(
        targetRole.fnid,
        targetRole.roleno,
        groupSkills.map((item) => item.ksId)
      )

      const roleLabel = `${details[0]?.functionName ?? `Function ${targetRole.fnid}`} - ${details[0]?.roleName ?? `Role ${targetRole.roleno}`}`
      futureRolePrepGroups.push({
        roleKey,
        roleLabel,
        skills: details.map((item) => ({
          ksId: item.ksId,
          knowledgeSkillType: item.knowledgeSkillType,
          ksCategory: item.ksCategory,
          ksName: item.ksName,
          ksDefinition: item.ksDefinition,
        })),
      })
    }

    return response.ok({
      data: {
        plan: plan.serialize(),
        roleProficiencyLabel: currentRole
          ? `${currentRole.fn?.fnName ?? `Function ${currentRole.fnid}`} - ${currentRole.role_name}`
          : 'Role Proficiency',
        roleProficiencySkills: roleProficiencyDetails.map((item) => ({
          ksId: item.ksId,
          knowledgeSkillType: item.knowledgeSkillType,
          ksCategory: item.ksCategory,
          ksName: item.ksName,
          ksDefinition: item.ksDefinition,
        })),
        selectedTargetRoles: targetRoles.map((role) => ({
          roleKey: `${role.fnid}_${role.roleno}`,
          fnid: role.fnid,
          roleno: role.roleno,
          hasSelectedSkills: futureRolePrepGroups.some(
            (group) => group.roleKey === `${role.fnid}_${role.roleno}`
          ),
        })),
        futureRolePrepGroups,
        otherSkills: Array.from({ length: 2 }, (_, index) => {
          const skill = otherSkills[index]

          return {
            id: skill?.id,
            sequence: index + 1,
            knowledgeSkillType: skill?.knowledgeSkillType ?? '',
            ksCategory: skill?.ksCategory ?? '',
            ksName: skill?.ksName ?? '',
            ksDefinition: skill?.ksDefinition ?? '',
          }
        }),
        otherSkillCategoryOptions,
      },
    })
  }

  /**
   * Stage 5: Development Planner
   * Lists action plans
   */
  private async getStage5Data(plan: DevelopmentPlan, response: HttpContext['response']) {
    const actionPlans = await DpActionPlan.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
      .preload('reminders', (reminderQuery) => {
        reminderQuery.orderBy('id', 'asc')
      })
    const availableFocusSkills = await this.getStage5AvailableFocusSkills(plan)

    return response.ok({
      data: {
        plan: plan.serialize(),
        actionPlans: actionPlans.map((ap) => ap.serialize()),
        availableFocusSkills,
      },
    })
  }

  /**
   * POST /api/development-plan/stage/:stage
   * Save stage data
   */
  async saveStage({ auth, request, response, params }: HttpContext) {
    const currentUser = auth.user!
    const stage = Number.parseInt(params.stage)
    const payload = request.all()
    const requestedUserId = request.input('userId')
    const userId = requestedUserId ? Number(requestedUserId) : currentUser.id
    const isManagerEdit = userId !== currentUser.id
    const subjectUser = isManagerEdit ? await User.find(userId) : currentUser

    if (isManagerEdit) {
      if (!subjectUser || subjectUser.mgrId !== currentUser.empId) {
        return response.forbidden({ error: 'Access denied' })
      }
    }

    if (!subjectUser) {
      return response.notFound({ error: 'User not found' })
    }

    const currentPeriod = await this.learningPeriodService.getCurrentPeriodForUser(subjectUser)
    if (!currentPeriod) {
      return response.badRequest({ error: 'No active performance-learning period is configured for this company' })
    }

    const cycleYear = this.getCycleYear()
    let plan = await DevelopmentPlan.query()
      .where('user_id', userId)
      .where('learning_period_id', currentPeriod.id)
      .first()

    if (!plan) {
      plan = await DevelopmentPlan.create({
        userId,
        cycleYear,
        learningPeriodId: currentPeriod.id,
        userStatus: 'stage_1',
        managerStatus: 'notSubmitted',
      })
    }

    try {
      switch (stage) {
        case 1:
          await this.saveStage1(plan, payload)
          break
        case 2:
          await this.saveStage2(plan, payload)
          break
        case 3:
          await this.saveStage3(plan, payload)
          break
        case 4:
          await this.saveStage4(plan, payload)
          break
        case 5:
          await this.saveStage5(plan, payload)
          break
        default:
          return response.badRequest({ error: 'Invalid stage' })
      }

      this.syncPlanStateAfterStageSave(plan, stage, isManagerEdit)
      await plan.save()

      return response.ok({ message: `Stage ${stage} saved successfully`, data: plan })
    } catch (error) {
      return response.internalServerError({ error: error.message })
    }
  }

  private async saveStage1(plan: DevelopmentPlan, payload: any) {
    const selectedSkillIds = Array.isArray(payload.selectedSkillIds)
      ? payload.selectedSkillIds
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isInteger(value) && value > 0)
      : []

    if (selectedSkillIds.length === 0 || selectedSkillIds.length > 3) {
      throw new Error('Select between 1 and 3 focus skills for role proficiency.')
    }

    // Clear existing
    await DpFocusSkillsProficiency.query().where('plan_id', plan.id).delete()

    // Insert new (max 3)
    const skills = selectedSkillIds.slice(0, 3)
    for (const [i, skill] of skills.entries()) {
      await DpFocusSkillsProficiency.create({
        planId: plan.id,
        ksId: skill,
        sequence: i + 1,
      })
    }
  }

  private async saveStage2(plan: DevelopmentPlan, payload: any) {
    const selectedRoleIds: string[] = Array.isArray(payload.selectedRoleIds)
      ? payload.selectedRoleIds
          .map((value: unknown) => String(value))
          .filter((value: string) => /^\d+_\d+$/.test(value))
      : []

    if (selectedRoleIds.length === 0 || selectedRoleIds.length > 2) {
      throw new Error('Select between 1 and 2 target roles.')
    }

    const uniqueSelectedRoleIds: string[] = Array.from(new Set(selectedRoleIds))

    // Clear existing
    await DpTargetRole.query().where('plan_id', plan.id).delete()

    // Insert new (max 2)
    const roles = uniqueSelectedRoleIds.slice(0, 2)
    for (const [i, role] of roles.entries()) {
      const [fnid, roleno] = role.split('_').map(Number)
      await DpTargetRole.create({
        planId: plan.id,
        fnid,
        roleno,
        sequence: i + 1,
      })
    }
  }

  private async saveStage3(plan: DevelopmentPlan, payload: any) {
    const selectedSkills: Array<{
      ksId: number
      roleKey: string
      sourceFnid: number
      sourceRoleno: number
    }> = Array.isArray(payload.selectedSkills)
      ? payload.selectedSkills
          .map((value: unknown) => {
            if (!value || typeof value !== 'object') {
              return null
            }
            const entry = value as { ksId?: unknown; roleKey?: unknown }
            const ksId = Number(entry.ksId)
            const roleKey = String(entry.roleKey ?? '')
            if (!Number.isInteger(ksId) || ksId <= 0 || !/^\d+_\d+$/.test(roleKey)) {
              return null
            }
            const [sourceFnid, sourceRoleno] = roleKey.split('_').map(Number)
            return { ksId, roleKey, sourceFnid, sourceRoleno }
          })
          .filter(
            (
              value: {
                ksId: number
                roleKey: string
                sourceFnid: number
                sourceRoleno: number
              } | null
            ): value is {
              ksId: number
              roleKey: string
              sourceFnid: number
              sourceRoleno: number
            } => value !== null
          )
      : Array.isArray(payload.selectedSkillIds)
        ? payload.selectedSkillIds
            .map((value: unknown) => Number(value))
            .filter((value: number) => Number.isInteger(value) && value > 0)
            .map((ksId: number) => ({ ksId, roleKey: '', sourceFnid: 0, sourceRoleno: 0 }))
        : []

    if (selectedSkills.length === 0 || selectedSkills.length > 3) {
      throw new Error('Select between 1 and 3 focus skills for target roles.')
    }

    const uniqueSelections: Array<{
      ksId: number
      roleKey: string
      sourceFnid: number
      sourceRoleno: number
    }> = Array.from(
      new Map(
        selectedSkills.map((entry) => [`${entry.roleKey}:${entry.ksId}`, entry] as const)
      ).values()
    )

    // Clear existing
    await DpFocusSkillsTarget.query().where('plan_id', plan.id).delete()

    // Insert new (max 3)
    const skills = uniqueSelections.slice(0, 3)
    for (const [i, skill] of skills.entries()) {
      await DpFocusSkillsTarget.create({
        planId: plan.id,
        ksId: skill.ksId,
        sourceFnid: skill.sourceFnid || null,
        sourceRoleno: skill.sourceRoleno || null,
        sequence: i + 1,
      })
    }
  }

  private async getRoleSkillDetails(fnid: number, roleno: number, ksIds: number[]) {
    const rows = await db
      .from('ks_definitions as kd')
      .join('fn_roles as fr', (join) => {
        join.on('kd.fnid', '=', 'fr.fnid').andOn('kd.roleno', '=', 'fr.roleno')
      })
      .join('ks_frameworks as kf', (join) => {
        join
          .on('kd.fnid', '=', 'kf.fnid')
          .andOn('kd.catid', '=', 'kf.catid')
          .andOn('kd.catord', '=', 'kf.catord')
      })
      .join('ks_cats as kc', 'kf.catid', 'kc.id')
      .join('fns as f', 'kf.fnid', 'f.id')
      .select(
        'kd.id as ksid',
        'f.fn_name as function_name',
        'fr.role_name as role_name',
        'kc.k_ss_gs as knowledge_skill_type',
        'kc.kscategory as ks_category',
        'kf.ksname as ks_name',
        'kd.ksdefinition as ks_definition',
        'kd.catid',
        'kd.catord'
      )
      .where('kd.fnid', fnid)
      .where('kd.roleno', roleno)
      .whereIn('kd.id', ksIds)
      .orderBy('kd.catid', 'asc')
      .orderBy('kd.catord', 'asc')

    const rowByKsId = new Map(rows.map((row) => [Number(row.ksid), row]))
    return ksIds
      .map((ksId) => rowByKsId.get(ksId))
      .filter(
        (
          row
        ): row is {
          ksid: number
          function_name: string
          role_name: string
          knowledge_skill_type: string
          ks_category: string
          ks_name: string
          ks_definition: string | null
        } => Boolean(row)
      )
      .map((row) => ({
        ksId: Number(row.ksid),
        functionName: row.function_name,
        roleName: row.role_name,
        knowledgeSkillType: row.knowledge_skill_type,
        ksCategory: row.ks_category,
        ksName: row.ks_name,
        ksDefinition: row.ks_definition,
      }))
  }

  private async saveStage4(plan: DevelopmentPlan, payload: any) {
    const otherSkills = Array.isArray(payload.otherSkills) ? payload.otherSkills.slice(0, 2) : []

    type NormalizedOtherSkill = {
      id: number | null
      sequence: number
      knowledgeSkillType: 'Knowledge' | 'Situated Skill' | 'General Skill'
      ksCategory: string
      ksName: string
      ksDefinition: string
    }

    const normalizedOtherSkills: NormalizedOtherSkill[] = []

    for (const [index, value] of otherSkills.entries()) {
      if (!value || typeof value !== 'object') {
        continue
      }

      const entry = value as Record<string, unknown>
      const id = Number(entry.id)
      const knowledgeSkillType = this.normalizeKnowledgeSkillType(entry.knowledgeSkillType)
      const ksCategory = String(entry.ksCategory ?? '').trim()
      const ksName = String(entry.ksName ?? '').trim()
      const ksDefinition = String(entry.ksDefinition ?? '').trim()
      const hasAnyValue = Boolean(knowledgeSkillType || ksCategory || ksName || ksDefinition)

      if (!hasAnyValue) {
        continue
      }

      if (!knowledgeSkillType || !ksCategory || !ksName || !ksDefinition) {
        throw new Error(
          `Other Knowledge/Skill ${index + 1} must include type, category, name, and definition.`
        )
      }

      normalizedOtherSkills.push({
        id: Number.isInteger(id) && id > 0 ? id : null,
        sequence: index + 1,
        knowledgeSkillType,
        ksCategory,
        ksName,
        ksDefinition,
      })
    }

    const allowedCategories = new Map<string, Set<string>>()
    for (const option of await this.getOtherSkillCategoryOptions()) {
      const values = allowedCategories.get(option.knowledgeSkillType) ?? new Set<string>()
      values.add(option.ksCategory)
      allowedCategories.set(option.knowledgeSkillType, values)
    }

    for (const skill of normalizedOtherSkills) {
      if (!allowedCategories.get(skill.knowledgeSkillType)?.has(skill.ksCategory)) {
        throw new Error(
          `Other Knowledge/Skill ${skill.sequence} has an invalid category for the selected type.`
        )
      }
    }

    const existingSkills = await DpOtherSkill.query().where('plan_id', plan.id)
    const existingSkillById = new Map(existingSkills.map((skill) => [skill.id, skill]))
    const retainedSkillIds = new Set<number>()

    for (const skill of normalizedOtherSkills) {
      const existingSkill = skill.id ? existingSkillById.get(skill.id) : null

      if (existingSkill) {
        existingSkill.sequence = skill.sequence
        existingSkill.knowledgeSkillType = skill.knowledgeSkillType
        existingSkill.ksCategory = skill.ksCategory
        existingSkill.ksName = skill.ksName
        existingSkill.ksDefinition = skill.ksDefinition
        await existingSkill.save()
        retainedSkillIds.add(existingSkill.id)
        continue
      }

      const createdSkill = await DpOtherSkill.create({
        planId: plan.id,
        sequence: skill.sequence,
        knowledgeSkillType: skill.knowledgeSkillType,
        ksCategory: skill.ksCategory,
        ksName: skill.ksName,
        ksDefinition: skill.ksDefinition,
      })
      retainedSkillIds.add(createdSkill.id)
    }

    const idsToDelete = existingSkills
      .map((skill) => skill.id)
      .filter((id) => !retainedSkillIds.has(id))

    if (idsToDelete.length > 0) {
      await DpOtherSkill.query().where('plan_id', plan.id).whereIn('id', idsToDelete).delete()
    }
  }

  private async saveStage5(plan: DevelopmentPlan, payload: any) {
    const { actionPlans = [] } = payload
    const allowedSkillKeys = new Set(
      (await this.getStage5AvailableFocusSkills(plan)).map((skill) => skill.id)
    )

    // Clear existing action plans & reminders
    const existingPlans = await DpActionPlan.query().where('plan_id', plan.id)
    for (const ap of existingPlans) {
      await DpReminder.query().where('action_plan_id', ap.id).delete()
    }
    await DpActionPlan.query().where('plan_id', plan.id).delete()

    // Insert new action plans (max 5)
    const plans = actionPlans.slice(0, 5)
    for (const [i, apData] of plans.entries()) {
      const addressedSkillsIds = this.normalizeAddressedSkillKeys(apData.addressedSkillsIds).filter(
        (value) => allowedSkillKeys.has(value)
      )

      const reminders = this.normalizeStage5Reminders(apData.reminders)

      const newAp = await DpActionPlan.create({
        planId: plan.id,
        sequence: i + 1,
        actionCategory: apData.actionCategory,
        taskDescription: apData.taskDescription || null,
        successCriteria: apData.successCriteria || null,
        startDate: apData.startDate ? DateTime.fromISO(apData.startDate) : null,
        completionDate: apData.completionDate ? DateTime.fromISO(apData.completionDate) : null,
        milestone1Date: apData.milestone1Date ? DateTime.fromISO(apData.milestone1Date) : null,
        milestone1Text: apData.milestone1Text || null,
        milestone2Date: apData.milestone2Date ? DateTime.fromISO(apData.milestone2Date) : null,
        milestone2Text: apData.milestone2Text || null,
        progressNotes: apData.progressNotes || null,
        addressedSkillsIds,
      })

      for (const reminder of reminders) {
        await ReminderService.scheduleReminder(newAp, reminder)
      }
    }
  }

  private normalizeStage5Reminders(reminders: unknown): ReminderScheduleInput[] {
    if (!Array.isArray(reminders)) {
      return []
    }

    const normalized = reminders
      .map((reminder) => this.normalizeStage5Reminder(reminder))
      .filter((reminder): reminder is ReminderScheduleInput => reminder !== null)

    if (normalized.length > 8) {
      throw new Error('Each action plan can have at most 8 reminders.')
    }

    return normalized
  }

  private normalizeStage5Reminder(reminder: unknown): ReminderScheduleInput | null {
    if (!reminder || typeof reminder !== 'object') {
      return null
    }

    const entry = reminder as Record<string, unknown>
    const remindRef = String(entry.remindRef ?? '')
    const remindBeforeAfter = String(entry.remindBeforeAfter ?? '')
    const remindVia = String(entry.remindVia ?? '')
    const repeatPeriod = String(entry.repeatPeriod ?? 'once')
    const repeatUnit = entry.repeatUnit == null ? null : String(entry.repeatUnit)
    const recipientList = String(entry.recipientList ?? 'employee')
    const remindDays = Number(entry.remindDays)
    const repeatEvery = entry.repeatEvery == null ? null : Number(entry.repeatEvery)
    const isActive = entry.isActive !== false

    if (!['start_date', 'milestone_1', 'milestone_2', 'completion_date'].includes(remindRef)) {
      throw new Error('Reminder reference point is invalid.')
    }

    if (!['before', 'after'].includes(remindBeforeAfter)) {
      throw new Error('Reminder before/after selection is invalid.')
    }

    if (!['email', 'in_app', 'both'].includes(remindVia)) {
      throw new Error('Reminder delivery channel is invalid.')
    }

    if (!['employee', 'manager', 'both'].includes(recipientList)) {
      throw new Error('Reminder recipient is invalid.')
    }

    if (!Number.isInteger(remindDays) || remindDays < 0 || remindDays > 365) {
      throw new Error('Reminder days must be between 0 and 365.')
    }

    if (!['once', 'custom'].includes(repeatPeriod)) {
      throw new Error('Reminder repeat setting is invalid.')
    }

    if (repeatPeriod === 'once') {
      return {
        remindRef: remindRef as ReminderScheduleInput['remindRef'],
        remindDays,
        remindBeforeAfter: remindBeforeAfter as ReminderScheduleInput['remindBeforeAfter'],
        remindVia: remindVia as ReminderScheduleInput['remindVia'],
        repeatPeriod: 'once',
        repeatEvery: null,
        repeatUnit: null,
        recipientList: recipientList as ReminderScheduleInput['recipientList'],
        isActive,
      }
    }

    if (!['days', 'weeks', 'months'].includes(repeatUnit ?? '')) {
      throw new Error('Reminder repeat unit is invalid.')
    }

    if (
      repeatEvery === null ||
      !Number.isInteger(repeatEvery) ||
      repeatEvery < 1 ||
      repeatEvery > 52
    ) {
      throw new Error('Reminder repeat interval must be between 1 and 52.')
    }

    return {
      remindRef: remindRef as ReminderScheduleInput['remindRef'],
      remindDays,
      remindBeforeAfter: remindBeforeAfter as ReminderScheduleInput['remindBeforeAfter'],
      remindVia: remindVia as ReminderScheduleInput['remindVia'],
      repeatPeriod: 'custom',
      repeatEvery,
      repeatUnit: repeatUnit as NonNullable<ReminderScheduleInput['repeatUnit']>,
      recipientList: recipientList as ReminderScheduleInput['recipientList'],
      isActive,
    }
  }

  /**
   * POST /api/development-plan/finalize
   * User or Manager submits the entire plan, marking it complete
   */
  async finalize({ auth, request, response }: HttpContext) {
    const currentUser = auth.user!
    const { isManager } = request.all()
    const requestedUserId = request.input('userId')
    const userId = requestedUserId ? Number(requestedUserId) : currentUser.id

    const targetUser = userId === currentUser.id ? currentUser : await User.find(userId)
    if (!targetUser) {
      return response.notFound({ error: 'User not found' })
    }

    if (targetUser.id !== currentUser.id && targetUser.mgrId !== currentUser.empId) {
      return response.forbidden({ error: 'Access denied' })
    }

    const currentPeriod = await this.learningPeriodService.getCurrentPeriodForUser(targetUser)
    if (!currentPeriod) {
      return response.badRequest({ error: 'No active performance-learning period is configured for this company' })
    }

    const plan = await DevelopmentPlan.query()
      .where('user_id', targetUser.id)
      .where('learning_period_id', currentPeriod.id)
      .first()

    if (!plan) {
      return response.notFound({ error: 'Development plan not found' })
    }

    if (isManager) {
      if (plan.userStatus !== 'completed') {
        return response.badRequest({ error: 'Employee must submit the plan before manager decision.' })
      }

      plan.managerStatus = 'approved'
      plan.managerSubmittedAt = DateTime.now()
    } else {
      if (plan.userStatus !== 'stage_5' && plan.userStatus !== 'completed') {
        return response.badRequest({ error: 'Complete all 5 stages before submitting the plan.' })
      }

      plan.userStatus = 'completed'
      plan.userSubmittedAt = DateTime.now()
      if (plan.managerStatus !== 'approved') {
        plan.managerStatus = 'stage_5'
        plan.managerSubmittedAt = null
      }
    }

    await plan.save()
    return response.ok({ message: 'Plan finalized', data: plan })
  }

  /**
   * GET /api/development-plan/export
   * Export development plan as CSV
   */
  async exportCsv({ auth, request, response }: HttpContext) {
    const currentUser = auth.user!
    const userId = request.input('userId') || currentUser.id
    const targetUser = userId === currentUser.id ? currentUser : await User.find(userId)

    if (!targetUser) {
      return response.notFound({ error: 'User not found' })
    }

    const currentPeriod = await this.learningPeriodService.getCurrentPeriodForUser(targetUser)
    if (!currentPeriod) {
      return response.badRequest({ error: 'No active performance-learning period is configured for this company' })
    }

    const cycleYear = this.getCycleYear()
    const plan = await DevelopmentPlan.query()
      .where('user_id', userId)
      .where('learning_period_id', currentPeriod.id)
      .first()

    if (!plan) {
      return response.notFound({ error: 'Plan not found' })
    }

    // Check permissions: user or manager only
    if (userId !== currentUser.id) {
      const subjectUser = await User.find(userId)
      if (!subjectUser || subjectUser.mgrId !== currentUser.empId) {
        return response.forbidden({ error: 'Access denied' })
      }
    }

    // Check if approved by manager
    if (plan.managerStatus !== 'approved') {
      return response.forbidden({ error: 'Plan must be approved by manager before export' })
    }

    const actionPlans = await DpActionPlan.query()
      .where('plan_id', plan.id)
      .orderBy('sequence', 'asc')
      .preload('reminders')
    const availableFocusSkills = await this.getStage5AvailableFocusSkills(plan)
    const focusSkillLabelByKey = new Map(
      availableFocusSkills.map((skill) => [
        skill.id,
        skill.displayLabel ?? skill.ksdefinition ?? skill.id,
      ])
    )

    // Generate CSV
    const csvContent = this.generateActionPlansCSV(actionPlans, focusSkillLabelByKey)

    response.header('Content-Type', 'text/csv')
    response.header(
      'Content-Disposition',
      `attachment; filename="development-plan-${userId}-${cycleYear}.csv"`
    )
    return response.send(csvContent)
  }

  private generateActionPlansCSV(
    actionPlans: DpActionPlan[],
    focusSkillLabelByKey: Map<string, string>
  ): string {
    const headers = [
      'No.',
      'Action Category',
      'Task Description',
      'Success Criteria',
      'Addressed Skills',
      'Start Date',
      'Completion Date',
      'Milestone 1',
      'Milestone 1 Date',
      'Milestone 2',
      'Milestone 2 Date',
      'Progress Notes',
    ]

    const rows = actionPlans.map((ap) => [
      ap.sequence,
      ap.actionCategory,
      ap.taskDescription || '',
      ap.successCriteria || '',
      ap.addressedSkillsIds?.map((id) => focusSkillLabelByKey.get(id) ?? id).join('; ') || '',
      ap.startDate?.toFormat('yyyy-MM-dd') || '',
      ap.completionDate?.toFormat('yyyy-MM-dd') || '',
      ap.milestone1Text || '',
      ap.milestone1Date?.toFormat('yyyy-MM-dd') || '',
      ap.milestone2Text || '',
      ap.milestone2Date?.toFormat('yyyy-MM-dd') || '',
      ap.progressNotes || '',
    ])

    // Simple CSV generation
    const csv = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    return csv
  }
}
