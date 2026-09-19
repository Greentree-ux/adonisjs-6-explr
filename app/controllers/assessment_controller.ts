import AssessmentSubmission from '#models/assessment_submission'
import EmpData from '#models/emp_data'
import User from '#models/user'
import FnRole from '#models/fn_role'
import Roletaskset from '#models/roletaskset'
import LearningPeriodService from '#services/learning_period_service'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

type AssessmentPayload = {
  additionalAssignmentsAndComments?: string
  subfunctions: Array<{
    subfnId: number
    rating: number | null
    strengths: string
    improvementOpportunity: string
    groups: Array<{
      sub2fnord: number
      tasks: Array<{
        taskKey: string
        toDevelop: boolean
      }>
    }>
  }>
}

export default class AssessmentController {
  private learningPeriodService = new LearningPeriodService()

  /**
   * GET /api/assessment
   * Returns assessment form data for the current user (self) or a team member.
   * Optional query param: userId — must be a direct report of the logged-in user.
   */
  async getFormData({ request, response, auth }: HttpContext) {
    const currentUser = auth.user!
    const subjectUser = await this.resolveSubjectUser(currentUser, request.input('userId'))
    if (!subjectUser) {
      return response.forbidden({ error: 'Access denied: not your direct report' })
    }

    if (!subjectUser.fnroleId) {
      return response.ok({ data: null, message: 'No role assigned to this user' })
    }

    const fnRole = await FnRole.query()
      .where('id', subjectUser.fnroleId)
      .preload('fn', (q) => q.preload('loc', (q2) => q2.preload('business')))
      .firstOrFail()

    const mgrName = await this.getManagerName(subjectUser.mgrId)

    const currentPeriod = await this.learningPeriodService.getCurrentPeriodForUser(subjectUser)
    if (!currentPeriod) {
      return response.badRequest({ error: 'No active performance-learning period is configured for this company' })
    }

    const submission = await AssessmentSubmission.query()
      .where('subjectUserId', subjectUser.id)
      .where('learningPeriodId', currentPeriod.id)
      .first()

    const tasksets = await Roletaskset.query()
      .where('fnid', fnRole.fnid)
      .where('roleno', fnRole.roleno)
      .orderBy('subfnid', 'asc')
      .orderBy('sub2fnord', 'asc')

    type SubfnGroup = {
      subfnId: number
      subfnName: string
      rating: number | null
      strengths: string
      improvementOpportunity: string
      groups: Array<{
        sub2fnord: number
        subSubFnName: string
        tasks: Array<{ taskKey: string; taskset: string; ei: string; lmh: string; toDevelop: boolean }>
      }>
    }

    const subfnMap = new Map<number, SubfnGroup>()
    const savedPayloadObj = submission?.payload as AssessmentPayload | undefined
    const savedPayload = savedPayloadObj?.subfunctions ?? []
    const savedAdditionalAssignmentsAndComments =
      savedPayloadObj?.additionalAssignmentsAndComments ?? ''
    const savedBySubfn = new Map(savedPayload.map((item) => [item.subfnId, item]))

    for (const ts of tasksets) {
      const savedSubfn = savedBySubfn.get(ts.subfnid)
      if (!subfnMap.has(ts.subfnid)) {
        subfnMap.set(ts.subfnid, {
          subfnId: ts.subfnid,
          subfnName: ts.subfn_name,
          rating: savedSubfn?.rating ?? null,
          strengths: savedSubfn?.strengths ?? '',
          improvementOpportunity: savedSubfn?.improvementOpportunity ?? '',
          groups: [],
        })
      }
      const subfn = subfnMap.get(ts.subfnid)!
      let group = subfn.groups.find((g) => g.sub2fnord === ts.sub2fnord)
      if (!group) {
        group = { sub2fnord: ts.sub2fnord, subSubFnName: ts.sub_sub_fn_name, tasks: [] }
        subfn.groups.push(group)
      }
      const taskKey = `${ts.subfnid}-${ts.sub2fnord}-${ts.taskset}`
      const savedGroup = savedSubfn?.groups.find((item) => item.sub2fnord === ts.sub2fnord)
      const savedTask = savedGroup?.tasks.find((item) => item.taskKey === taskKey)
      group.tasks.push({
        taskKey,
        taskset: ts.taskset,
        ei: ts.ei,
        lmh: ts.lmh,
        toDevelop: savedTask?.toDevelop ?? false,
      })
    }

    const today = new Date()
    const year = `Period starting ${currentPeriod.startedAt.toFormat('dd LLL yyyy')}`
    const isSelf = subjectUser.id === currentUser.id
    const selfSubmittedAt = submission?.selfSubmittedAt?.toISO() ?? null
    const managerSubmittedAt = submission?.managerSubmittedAt?.toISO() ?? null
    const canEdit = isSelf ? !selfSubmittedAt : Boolean(selfSubmittedAt) && !managerSubmittedAt

    return response.ok({
      data: {
        year,
        date: today.toLocaleDateString('en-GB'),
        additionalAssignmentsAndComments: savedAdditionalAssignmentsAndComments,
        user: {
          id: subjectUser.id,
          empId: subjectUser.empId,
          firstName: subjectUser.firstName,
          lastName: subjectUser.lastName ?? '',
          joinedAt: subjectUser.dateOfJoining?.toISODate() ?? null,
          inRoleSince: subjectUser.lastRoleChange?.toISODate() ?? null,
          mgrName,
        },
        role: {
          roleName: fnRole.role_name,
          fnName: fnRole.fn?.fnName ?? '',
          locationName: fnRole.fn?.loc?.locName ?? '',
          businessName: fnRole.fn?.loc?.business?.businessName ?? '',
        },
        workflow: {
          isSelf,
          canEdit,
          submitLabel: isSelf ? 'Submit Self Assessment' : 'Submit Manager Assessment',
          selfSubmittedAt,
          managerSubmittedAt,
        },
        subfunctions: Array.from(subfnMap.values()),
      },
    })
  }

  /**
   * GET /api/assessment/team
   * Returns the list of direct reports for the logged-in user.
   */
  async getTeamMembers({ response, auth }: HttpContext) {
    const currentUser = auth.user!
    const currentPeriod = await this.learningPeriodService.getCurrentPeriodForUser(currentUser)

    if (!currentUser.empId || !currentPeriod) {
      return response.ok({ data: [] })
    }

    const submissions = await AssessmentSubmission.query()
      .where('learningPeriodId', currentPeriod.id)
      .whereNotNull('selfSubmittedAt')

    const submittedIds = new Set(submissions.map((item) => item.subjectUserId))

    const teamMembers = await User.query()
      .where('mgrId', currentUser.empId)
      .whereIn('id', Array.from(submittedIds))
      .select('id', 'first_name', 'last_name', 'emp_id', 'fnrole_id')
      .orderBy('first_name', 'asc')

    return response.ok({
      data: teamMembers.map((member) => {
        const submission = submissions.find((item) => item.subjectUserId === member.id)
        return {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          empId: member.empId,
          fnroleId: member.fnroleId,
          selfSubmittedAt: submission?.selfSubmittedAt?.toISO() ?? null,
          managerSubmittedAt: submission?.managerSubmittedAt?.toISO() ?? null,
        }
      }),
    })
  }

  async submit({ request, response, auth }: HttpContext) {
    const currentUser = auth.user!
    const subjectUser = await this.resolveSubjectUser(currentUser, request.input('userId'))
    if (!subjectUser) {
      return response.forbidden({ error: 'Access denied: not your direct report' })
    }

    if (!subjectUser.fnroleId) {
      return response.badRequest({ error: 'No role assigned to this user' })
    }

    const submittedPayload = request.input('subfunctions')
    const additionalAssignmentsAndComments = request.input('additionalAssignmentsAndComments')
    if (!Array.isArray(submittedPayload)) {
      return response.badRequest({ error: 'Invalid assessment payload' })
    }

    if (
      additionalAssignmentsAndComments !== undefined &&
      additionalAssignmentsAndComments !== null &&
      typeof additionalAssignmentsAndComments !== 'string'
    ) {
      return response.badRequest({ error: 'Additional Assignments and Comments must be text.' })
    }

    const normalizedAdditionalAssignmentsAndComments =
      typeof additionalAssignmentsAndComments === 'string' ? additionalAssignmentsAndComments : ''

    const validationError = this.getSubmissionValidationError(
      submittedPayload,
      normalizedAdditionalAssignmentsAndComments
    )
    if (validationError) {
      return response.badRequest({ error: validationError })
    }

    const currentPeriod = await this.learningPeriodService.getCurrentPeriodForUser(subjectUser)
    if (!currentPeriod) {
      return response.badRequest({ error: 'No active performance-learning period is configured for this company' })
    }

    const cycleYear = this.getCycleYear()
    const isSelf = subjectUser.id === currentUser.id

    let submission = await AssessmentSubmission.query()
      .where('subjectUserId', subjectUser.id)
      .where('learningPeriodId', currentPeriod.id)
      .first()

    if (!submission) {
      submission = new AssessmentSubmission()
      submission.subjectUserId = subjectUser.id
      submission.cycleYear = cycleYear
      submission.learningPeriodId = currentPeriod.id
    }

    if (!isSelf && !submission.selfSubmittedAt) {
      return response.badRequest({ error: 'The employee has not submitted a self-assessment yet' })
    }

    if (submission.managerSubmittedAt) {
      return response.conflict({ error: 'This assessment has already been finalized by the manager' })
    }

    submission.managerEmpId = subjectUser.mgrId ?? null
    submission.fnroleId = subjectUser.fnroleId
    submission.payload = {
      subfunctions: submittedPayload,
      additionalAssignmentsAndComments: normalizedAdditionalAssignmentsAndComments,
    }

    if (isSelf) {
      submission.selfSubmittedAt = DateTime.now()
    } else {
      submission.managerSubmittedAt = DateTime.now()
    }

    await submission.save()

    return response.ok({
      message: isSelf ? 'Self-assessment submitted successfully' : 'Manager assessment submitted successfully',
    })
  }

  private async resolveSubjectUser(currentUser: User, rawUserId?: number | string | null) {
    const targetUserId = rawUserId ? Number(rawUserId) : currentUser.id
    if (targetUserId === currentUser.id) {
      return currentUser
    }

    const teamMember = await User.find(targetUserId)
    if (!teamMember) {
      return null
    }

    if (!currentUser.empId || teamMember.mgrId !== currentUser.empId) {
      return null
    }

    return teamMember
  }

  private async getManagerName(mgrEmpId: number | null) {
    if (!mgrEmpId) return null

    const managerUser = await User.query().where('empId', mgrEmpId).first()
    if (managerUser) {
      return `${managerUser.firstName}${managerUser.lastName ? ` ${managerUser.lastName}` : ''}`
    }

    const managerEmp = await EmpData.query().where('empId', mgrEmpId).first()
    if (managerEmp) {
      const fullName = `${managerEmp.firstName ?? ''}${managerEmp.lastName ? ` ${managerEmp.lastName}` : ''}`.trim()
      return fullName || String(mgrEmpId)
    }

    return String(mgrEmpId)
  }

  private getSubmissionValidationError(
    subfunctions: unknown[],
    additionalAssignmentsAndComments: string
  ): string | null {
    const hasMissingRatings = subfunctions.some((subfn) => {
      const rating = Number((subfn as { rating?: unknown })?.rating)
      return !Number.isInteger(rating) || rating < 1 || rating > 4
    })

    let toDevelopCount = 0
    for (const subfn of subfunctions) {
      const groups = Array.isArray((subfn as { groups?: unknown[] })?.groups)
        ? ((subfn as { groups: unknown[] }).groups ?? [])
        : []

      for (const group of groups) {
        const tasks = Array.isArray((group as { tasks?: unknown[] })?.tasks)
          ? ((group as { tasks: unknown[] }).tasks ?? [])
          : []

        for (const task of tasks) {
          const rawValue = (task as { toDevelop?: unknown })?.toDevelop
          const isChecked =
            rawValue === true || rawValue === 1 || rawValue === '1' || rawValue === 'true'
          if (isChecked) {
            toDevelopCount += 1
          }
        }
      }
    }

    const errors: string[] = []
    if (hasMissingRatings) {
      errors.push('Enter a score for every sub function before submitting.')
    }
    if (toDevelopCount < 2 || toDevelopCount > 7) {
      errors.push('Select between 2 and 7 boxes in the To Develop column before submitting.')
    }
    if (additionalAssignmentsAndComments.length > 255) {
      errors.push('Additional Assignments and Comments cannot exceed 255 characters.')
    }

    return errors.length > 0 ? errors.join(' ') : null
  }

  private getCycleYear() {
    const today = DateTime.now()
    return `${today.year - 1}-${String(today.year).slice(-2)}`
  }
}
