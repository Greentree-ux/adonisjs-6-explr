import EmpData from '#models/emp_data'
import User from '#models/user'
import FnRole from '#models/fn_role'
import AppRole from '#models/app_role'
import AccessPolicy from '#models/access_policy'
import Co from '#models/co'
import {
  empDataValidator,
  updateManagerValidator,
  inviteEmployeesValidator,
  updateUserRoleManagerValidator,
  accessPolicyValidator,
} from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import { readFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'
import LearningPeriodService from '#services/learning_period_service'

type SerializedEmpData = {
  id: number
  coId: number
  email: string
  firstName: string | null
  lastName: string | null
  empId: number | null
  invitationToken: string | null
  invitationSentAt: string | null
  fnroleId: number | null
  mgrId: number | null
  dateOfJoining: string | null
  lastRoleChange: string | null
  createdAt: string
  updatedAt: string
}

type CsvImportRow = {
  email?: string
  first_name?: string
  last_name?: string
  emp_id?: string
  date_of_joining?: string
  last_role_change?: string
}

export default class OrgAdminController {
  private learningPeriodService = new LearningPeriodService()

  // --- Employee Data ---

  async listEmpData({ response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const employees = await EmpData.query().where('coId', orgAdminCoId).orderBy('email', 'asc')
    return response.ok({ data: { empData: employees.map((employee) => this.serializeEmpData(employee)) } })
  }

  async addEmpData({ request, response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const data = await request.validateUsing(empDataValidator)

    const existing = await EmpData.findBy('email', data.email.trim().toLowerCase())
    if (existing) {
      return response.conflict({ message: 'This email already exists in employee data' })
    }

    const empData = await EmpData.create({
      coId: orgAdminCoId,
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      empId: data.empId ?? null,
      dateOfJoining: this.parseDateValue(data.dateOfJoining),
      lastRoleChange: this.parseDateValue(data.lastRoleChange),
    })
    return response.created({
      message: 'Employee added successfully',
      data: { empData: this.serializeEmpData(empData) },
    })
  }

  async importEmpData({ request, response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    const currentUserEmail = auth.user?.email?.trim().toLowerCase() ?? ''
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const updateExistingInput = String(request.input('updateExisting', 'true')).toLowerCase()
    const updateExisting = updateExistingInput !== 'false'
    const file = request.file('file', {
      extnames: ['csv'],
      size: '10mb',
    })

    if (!file) {
      return response.badRequest({ message: 'CSV file is required' })
    }

    if (!file.isValid) {
      return response.badRequest({ message: 'Please upload a valid CSV file' })
    }

    if (!file.tmpPath) {
      return response.badRequest({ message: 'Uploaded file could not be processed' })
    }

    const csvContent = await readFile(file.tmpPath, 'utf8')

    let rows: CsvImportRow[]
    try {
      rows = parse(csvContent, {
        columns: true,
        bom: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as CsvImportRow[]
    } catch {
      return response.badRequest({
        message:
          'CSV file could not be parsed. Ensure every row is comma-separated and matches the declared headers.',
      })
    }

    const headerColumns = this.extractCsvHeaders(csvContent)
    const expectedHeaders = [
      'email',
      'first_name',
      'last_name',
      'emp_id',
      'date_of_joining',
      'last_role_change',
    ]

    if (headerColumns.length !== expectedHeaders.length || !expectedHeaders.every((header, index) => headerColumns[index] === header)) {
      return response.badRequest({
        message: `Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}`,
      })
    }

    if (rows.length === 0) {
      return response.badRequest({ message: 'CSV file does not contain any employee rows' })
    }

    const seenEmails = new Set<string>()
    const results: Array<{ row: number; email: string; status: string }> = []
    let created = 0
    let updated = 0
    let skipped = 0

    for (const [index, rawRow] of rows.entries()) {
      const rowNumber = index + 2
      const normalizedEmail = rawRow.email?.trim().toLowerCase() ?? ''

      if (!normalizedEmail) {
        results.push({ row: rowNumber, email: '', status: 'Missing required email' })
        skipped += 1
        continue
      }

      if (seenEmails.has(normalizedEmail)) {
        results.push({ row: rowNumber, email: normalizedEmail, status: 'Duplicate email in CSV file' })
        skipped += 1
        continue
      }
      seenEmails.add(normalizedEmail)

      if (normalizedEmail === currentUserEmail) {
        results.push({
          row: rowNumber,
          email: normalizedEmail,
          status: 'You cannot update your own org-admin profile through CSV import',
        })
        skipped += 1
        continue
      }

      const parsedEmpId = this.parseEmpIdValue(rawRow.emp_id)
      if (rawRow.emp_id && parsedEmpId === null) {
        results.push({ row: rowNumber, email: normalizedEmail, status: 'Invalid emp_id. Use whole numbers only' })
        skipped += 1
        continue
      }

      const parsedDateOfJoining = this.parseDateValue(rawRow.date_of_joining ?? null)
      if (rawRow.date_of_joining && !parsedDateOfJoining) {
        results.push({ row: rowNumber, email: normalizedEmail, status: 'Invalid date_of_joining. Use DD-MM-YYYY' })
        skipped += 1
        continue
      }

      const parsedLastRoleChange = this.parseDateValue(rawRow.last_role_change ?? null)
      if (rawRow.last_role_change && !parsedLastRoleChange) {
        results.push({ row: rowNumber, email: normalizedEmail, status: 'Invalid last_role_change. Use DD-MM-YYYY' })
        skipped += 1
        continue
      }

      const existing = await EmpData.findBy('email', normalizedEmail)
      if (existing && existing.coId !== orgAdminCoId) {
        results.push({ row: rowNumber, email: normalizedEmail, status: 'Email already belongs to another company' })
        skipped += 1
        continue
      }

      const payload = {
        coId: orgAdminCoId,
        email: normalizedEmail,
        firstName: this.cleanCsvText(rawRow.first_name),
        lastName: this.cleanCsvText(rawRow.last_name),
        empId: parsedEmpId,
        dateOfJoining: parsedDateOfJoining,
        lastRoleChange: parsedLastRoleChange,
      }

      if (existing) {
        if (!updateExisting) {
          results.push({ row: rowNumber, email: normalizedEmail, status: 'Skipped existing employee' })
          skipped += 1
          continue
        }

        existing.merge(payload)
        await existing.save()
        updated += 1
        results.push({ row: rowNumber, email: normalizedEmail, status: 'Updated' })

        const user = await User.findBy('email', normalizedEmail)
        if (user && user.coId === orgAdminCoId) {
          user.merge({
            empId: payload.empId,
            dateOfJoining: payload.dateOfJoining,
            lastRoleChange: payload.lastRoleChange,
          })
          await user.save()
        }

        continue
      }

      await EmpData.create(payload)
      created += 1
      results.push({ row: rowNumber, email: normalizedEmail, status: 'Created' })
    }

    return response.ok({
      message: `CSV import completed: ${created} created, ${updated} updated, ${skipped} skipped`,
      data: {
        summary: {
          totalRows: rows.length,
          created,
          updated,
          skipped,
        },
        results,
      },
    })
  }

  async updateEmpData({ params, request, response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const empData = await EmpData.query().where('id', params.id).where('coId', orgAdminCoId).first()
    if (!empData) {
      return response.notFound({ message: 'Employee record not found' })
    }

    if (this.isOwnOrgAdminProfile(empData.email, auth.user?.email)) {
      return response.forbidden({ message: 'You cannot edit your own org-admin profile here' })
    }

    const data = await request.validateUsing(empDataValidator)
    const emailConflict = await EmpData.query()
      .where('email', data.email.trim().toLowerCase())
      .whereNot('id', empData.id)
      .first()

    if (emailConflict) {
      return response.conflict({ message: 'This email already exists in employee data' })
    }

    empData.merge({
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      empId: data.empId ?? null,
      dateOfJoining: this.parseDateValue(data.dateOfJoining),
      lastRoleChange: this.parseDateValue(data.lastRoleChange),
    })
    await empData.save()

    const user = await User.findBy('email', empData.email)
    if (user) {
      user.merge({
        empId: empData.empId ?? user.empId,
        dateOfJoining: empData.dateOfJoining,
        lastRoleChange: empData.lastRoleChange,
      })
      await user.save()
    }

    return response.ok({
      message: 'Employee record updated',
      data: { empData: this.serializeEmpData(empData) },
    })
  }

  async removeEmpData({ params, response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const empData = await EmpData.query().where('id', params.id).where('coId', orgAdminCoId).first()
    if (!empData) {
      return response.notFound({ message: 'Employee record not found' })
    }

    if (this.isOwnOrgAdminProfile(empData.email, auth.user?.email)) {
      return response.forbidden({ message: 'You cannot remove your own org-admin profile here' })
    }

    await empData.delete()
    return response.ok({ message: 'Employee record removed' })
  }

  // --- Employee-Manager Mapping ---

  async listUsers({ response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const users = await User.query()
      .where('coId', orgAdminCoId)
      .select('id', 'email', 'firstName', 'lastName', 'empId', 'mgrId')
      .orderBy('firstName', 'asc')

    return response.ok({ data: { users } })
  }

  async updateUserManager({ params, request, response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const { mgrId } = await request.validateUsing(updateManagerValidator)

    const user = await User.query().where('id', params.id).where('coId', orgAdminCoId).first()
    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    if (mgrId && !(await this.companyHasEmpId(orgAdminCoId, mgrId))) {
      return response.badRequest({ message: 'Selected manager does not belong to your company' })
    }

    user.mgrId = mgrId
    await user.save()

    return response.ok({
      message: 'Manager updated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          empId: user.empId,
          mgrId: user.mgrId,
        },
      },
    })
  }

  // --- Invitations ---

  async listFnRoles({ response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const fnRoles = await FnRole.query()
      .whereHas('fn', (fnQuery) => {
        fnQuery.whereHas('loc', (locQuery) => {
          locQuery.whereHas('business', (businessQuery) => {
            businessQuery.where('coId', orgAdminCoId)
          })
        })
      })
      .select('id', 'fnid', 'roleno', 'role_name')
      .preload('fn')
      .orderBy('fnid', 'asc')
      .orderBy('roleno', 'asc')

    const result = fnRoles.map((r) => ({
      id: r.id,
      fnid: r.fnid,
      fnName: r.fn?.fnName ?? '',
      roleno: r.roleno,
      roleName: r.role_name,
    }))

    return response.ok({ data: { fnRoles: result } })
  }

  async listEmpDataForInvite({ response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    // Return employees who haven't been registered yet
    const registeredEmails = await User.query().where('coId', orgAdminCoId).select('email')
    const emailSet = new Set(registeredEmails.map((u) => u.email.toLowerCase()))

    const employees = await EmpData.query().where('coId', orgAdminCoId).orderBy('email', 'asc')
    const unregistered = employees.filter((e) => !emailSet.has(e.email.toLowerCase()))

    return response.ok({ data: { empData: unregistered } })
  }

  async listRegisteredEmployees({ response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const userRole = await AppRole.findBy('rName', 'user')
    if (!userRole) {
      return response.ok({ data: { employees: [] } })
    }

    const users = await User.query()
      .where('approleId', userRole.id)
      .where('coId', orgAdminCoId)
      .preload('fnrole', (q) => q.preload('fn'))
      .orderBy('firstName', 'asc')

    const employees = users.map((u) => ({
      id: u.id,
      empId: u.empId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      fnroleId: u.fnroleId,
      fnRoleLabel: u.fnrole
        ? `${u.fnrole.fn?.fnName ?? ''} — ${u.fnrole.role_name}`
        : null,
      mgrId: u.mgrId,
    }))

    return response.ok({ data: { employees } })
  }

  async updateUserRoleManager({ params, request, response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const data = await request.validateUsing(updateUserRoleManagerValidator)

    const user = await User.query().where('id', params.id).where('coId', orgAdminCoId).first()
    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    if (data.fnroleId && !(await this.companyHasFnRole(orgAdminCoId, data.fnroleId))) {
      return response.badRequest({ message: 'Selected Function Role does not belong to your company' })
    }

    if (data.mgrId && !(await this.companyHasEmpId(orgAdminCoId, data.mgrId))) {
      return response.badRequest({ message: 'Selected manager does not belong to your company' })
    }

    const changes: string[] = []
    let oldFnRoleLabel = ''
    let newFnRoleLabel = ''
    let oldMgrLabel = ''
    let newMgrLabel = ''

    // Track fnrole change
    if (data.fnroleId !== undefined && data.fnroleId !== user.fnroleId) {
      if (user.fnroleId) {
        const oldRole = await FnRole.query().where('id', user.fnroleId).preload('fn').first()
        oldFnRoleLabel = oldRole ? `${oldRole.fn?.fnName ?? ''} — ${oldRole.role_name}` : 'None'
      } else {
        oldFnRoleLabel = 'None'
      }

      if (data.fnroleId) {
        const newRole = await FnRole.query().where('id', data.fnroleId).preload('fn').first()
        newFnRoleLabel = newRole ? `${newRole.fn?.fnName ?? ''} — ${newRole.role_name}` : 'Unknown'
      } else {
        newFnRoleLabel = 'None'
      }

      user.fnroleId = data.fnroleId
      user.lastRoleChange = DateTime.now().startOf('day')
      changes.push(`Function Role changed from "${oldFnRoleLabel}" to "${newFnRoleLabel}"`)
    }

    // Track manager change
    if (data.mgrId !== undefined && data.mgrId !== user.mgrId) {
      oldMgrLabel = user.mgrId ? await this.getManagerLabel(user.mgrId) : 'None'
      newMgrLabel = data.mgrId ? await this.getManagerLabel(data.mgrId) : 'None'

      user.mgrId = data.mgrId ?? 0
      changes.push(`Manager changed from "${oldMgrLabel}" to "${newMgrLabel}"`)
    }

    await user.save()

    const empData = await EmpData.findBy('email', user.email)
    if (empData) {
      empData.mgrId = user.mgrId ?? null
      empData.fnroleId = user.fnroleId ?? null
      if (user.lastRoleChange) {
        empData.lastRoleChange = user.lastRoleChange
      }
      await empData.save()
    }

    // Send notification email if there were changes
    if (changes.length > 0) {
      try {
        await mail.send((message) => {
          message
            .to(user.email)
            .subject('Your Role/Manager Assignment Has Changed')
            .html(
              `
              <h1>Assignment Update</h1>
              <p>Hello ${user.firstName},</p>
              <p>The following changes have been made to your assignment:</p>
              <ul>${changes.map((c) => `<li>${c}</li>`).join('')}</ul>
              <p>If you have questions, please contact your Org Admin.</p>
            `.trim()
            )
        })
      } catch {
        // Don't fail the update if email fails
      }
    }

    return response.ok({
      message: changes.length > 0 ? 'Updated successfully' : 'No changes detected',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          empId: user.empId,
          fnroleId: user.fnroleId,
          mgrId: user.mgrId,
        },
      },
    })
  }

  private async getManagerLabel(mgrId: number): Promise<string> {
    const mgr = await User.query().where('empId', mgrId).first()
    if (mgr) return `${mgr.firstName} ${mgr.lastName ?? ''} (${mgrId})`.trim()
    const empMgr = await EmpData.query().where('empId', mgrId).first()
    if (empMgr) return `${empMgr.firstName ?? ''} ${empMgr.lastName ?? ''} (${mgrId})`.trim()
    return String(mgrId)
  }

  private parseDateValue(value?: string | null) {
    if (!value) return null
    const parsed = DateTime.fromFormat(value.trim(), 'dd-MM-yyyy')
    return parsed.isValid ? parsed.startOf('day') : null
  }

  private parseEmpIdValue(value?: string | null): number | null {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (!/^\d+$/.test(trimmed)) return null
    return Number(trimmed)
  }

  private cleanCsvText(value?: string | null): string | null {
    const trimmed = value?.trim() ?? ''
    return trimmed ? trimmed : null
  }

  private extractCsvHeaders(csvContent: string): string[] {
    const firstLine = csvContent.split(/\r?\n/, 1)[0] ?? ''
    return firstLine
      .replace(/^\uFEFF/, '')
      .split(',')
      .map((header) => header.trim())
  }

  private formatDateValue(value: DateTime | null): string | null {
    return value ? value.toFormat('dd-MM-yyyy') : null
  }

  private isOwnOrgAdminProfile(
    recordEmail: string | null | undefined,
    currentUserEmail: string | null | undefined
  ): boolean {
    return (recordEmail?.trim().toLowerCase() ?? '') === (currentUserEmail?.trim().toLowerCase() ?? '')
  }

  private serializeEmpData(empData: EmpData): SerializedEmpData {
    return {
      id: empData.id,
      coId: empData.coId,
      email: empData.email,
      firstName: empData.firstName,
      lastName: empData.lastName,
      empId: empData.empId,
      invitationToken: empData.invitationToken,
      invitationSentAt: empData.invitationSentAt?.toISO() ?? null,
      fnroleId: empData.fnroleId,
      mgrId: empData.mgrId,
      dateOfJoining: this.formatDateValue(empData.dateOfJoining),
      lastRoleChange: this.formatDateValue(empData.lastRoleChange),
      createdAt: empData.createdAt.toISO() ?? '',
      updatedAt: empData.updatedAt.toISO() ?? '',
    }
  }

  // --- Access Policy ---

  async getAccessPolicy({ response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const company = await Co.find(orgAdminCoId)
    const policies = await AccessPolicy.query().where('coId', orgAdminCoId).orderBy('coId', 'asc')
    const resetState = await this.learningPeriodService.getResetStateForCompany(orgAdminCoId, auth.user!.id)

    return response.ok({
      data: {
        companies: company ? [{ id: company.id, coName: company.coName }] : [],
        policies: policies.map((p) => ({
          id: p.id,
          coId: p.coId,
          levelRestriction: p.levelRestriction,
          functionScope: p.functionScope,
        })),
        resetState,
      },
    })
  }

  async startFreshAssessmentDevelopment({ response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ message: 'Not authenticated' })
    }

    try {
      const result = await this.learningPeriodService.startFreshPeriod(user)
      return response.ok({ message: result.message, data: { resetState: result.state } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start a fresh period'
      const status = message.includes('must confirm') || message.includes('available after') ? 409 : 400
      return response.status(status).send({ message })
    }
  }

  async updateAccessPolicy({ request, response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const data = await request.validateUsing(accessPolicyValidator)

    if (data.coId !== orgAdminCoId) {
      return response.forbidden({ message: 'You can only manage access policy for your own company' })
    }

    // Verify the company exists
    const co = await Co.find(data.coId)
    if (!co) {
      return response.notFound({ message: 'Company not found' })
    }

    let policy = await AccessPolicy.findBy('coId', data.coId)
    if (policy) {
      policy.merge({
        levelRestriction: data.levelRestriction,
        functionScope: data.functionScope,
      })
      await policy.save()
    } else {
      policy = await AccessPolicy.create({
        coId: data.coId,
        levelRestriction: data.levelRestriction,
        functionScope: data.functionScope,
      })
    }

    return response.ok({
      message: 'Access policy updated',
      data: {
        policy: {
          id: policy.id,
          coId: policy.coId,
          levelRestriction: policy.levelRestriction,
          functionScope: policy.functionScope,
        },
      },
    })
  }

  async sendInvitations({ request, response, auth }: HttpContext) {
    const orgAdminCoId = this.getOrgAdminCoId(auth.user)
    if (!orgAdminCoId) {
      return response.forbidden({ message: 'Org Admin is not assigned to a company' })
    }

    const { invitations } = await request.validateUsing(inviteEmployeesValidator)
    const appUrl = env.get('APP_URL', 'http://localhost:3333')

    const results: { email: string; status: string }[] = []

    for (const inv of invitations) {
      const empData = await EmpData.query()
        .where('id', inv.empDataId)
        .where('coId', orgAdminCoId)
        .first()
      if (!empData) {
        results.push({ email: `ID ${inv.empDataId}`, status: 'Employee not found' })
        continue
      }

      if (!(await this.companyHasFnRole(orgAdminCoId, inv.fnroleId))) {
        results.push({ email: empData.email, status: 'Function role does not belong to your company' })
        continue
      }

      if (!(await this.companyHasEmpId(orgAdminCoId, inv.mgrId))) {
        results.push({ email: empData.email, status: 'Manager does not belong to your company' })
        continue
      }

      // Check if already registered
      const existingUser = await User.findBy('email', empData.email)
      if (existingUser) {
        results.push({ email: empData.email, status: 'Already registered' })
        continue
      }

      // Generate invitation token
      const token = randomBytes(32).toString('hex')
      empData.invitationToken = token
      empData.invitationSentAt = DateTime.now()
      empData.fnroleId = inv.fnroleId
      empData.mgrId = inv.mgrId
      await empData.save()

      const registerUrl = `${appUrl}/register-invite?token=${token}`

      try {
        await mail.send((message) => {
          message
            .to(empData.email)
            .subject('You are invited to register')
            .html(
              `
              <h1>Registration Invitation</h1>
              <p>Hello ${empData.firstName ?? ''},</p>
              <p>You have been invited to register at the Function &amp; Role Management application.</p>
              <p>Click the link below to complete your registration:</p>
              <p><a href="${registerUrl}">Register Now</a></p>
              <p>If you did not expect this email, please ignore it.</p>
            `.trim()
            )
        })
        results.push({ email: empData.email, status: 'Invitation sent' })
      } catch {
        results.push({ email: empData.email, status: 'Failed to send email' })
      }
    }

    return response.ok({
      message: `Processed ${results.length} invitation(s)`,
      data: { results },
    })
  }

  private getOrgAdminCoId(user: User | null | undefined): number | null {
    return user?.coId ?? null
  }

  private async companyHasEmpId(coId: number, empId: number): Promise<boolean> {
    const matchingUser = await User.query().where('coId', coId).where('empId', empId).first()
    if (matchingUser) {
      return true
    }

    const matchingEmpData = await EmpData.query().where('coId', coId).where('empId', empId).first()
    return !!matchingEmpData
  }

  private async companyHasFnRole(coId: number, fnroleId: number): Promise<boolean> {
    const fnRole = await FnRole.query()
      .where('id', fnroleId)
      .whereHas('fn', (fnQuery) => {
        fnQuery.whereHas('loc', (locQuery) => {
          locQuery.whereHas('business', (businessQuery) => {
            businessQuery.where('coId', coId)
          })
        })
      })
      .first()

    return !!fnRole
  }
}
