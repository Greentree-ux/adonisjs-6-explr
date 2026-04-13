import EmpData from '#models/emp_data'
import User from '#models/user'
import FnRole from '#models/fn_role'
import { empDataValidator, updateManagerValidator, inviteEmployeesValidator } from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'

export default class OrgAdminController {
  // --- Employee Data ---

  async listEmpData({ response }: HttpContext) {
    const employees = await EmpData.query().orderBy('email', 'asc')
    return response.ok({ data: { empData: employees } })
  }

  async addEmpData({ request, response }: HttpContext) {
    const data = await request.validateUsing(empDataValidator)

    const existing = await EmpData.findBy('email', data.email.trim().toLowerCase())
    if (existing) {
      return response.conflict({ message: 'This email already exists in employee data' })
    }

    const empData = await EmpData.create({
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      empId: data.empId ?? null,
    })
    return response.created({
      message: 'Employee added successfully',
      data: { empData },
    })
  }

  async updateEmpData({ params, request, response }: HttpContext) {
    const empData = await EmpData.find(params.id)
    if (!empData) {
      return response.notFound({ message: 'Employee record not found' })
    }

    const data = await request.validateUsing(empDataValidator)
    empData.merge({
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      empId: data.empId ?? null,
    })
    await empData.save()

    return response.ok({
      message: 'Employee record updated',
      data: { empData },
    })
  }

  async removeEmpData({ params, response }: HttpContext) {
    const empData = await EmpData.find(params.id)
    if (!empData) {
      return response.notFound({ message: 'Employee record not found' })
    }

    await empData.delete()
    return response.ok({ message: 'Employee record removed' })
  }

  // --- Employee-Manager Mapping ---

  async listUsers({ response }: HttpContext) {
    const users = await User.query()
      .select('id', 'email', 'firstName', 'lastName', 'empId', 'mgrId')
      .orderBy('firstName', 'asc')

    return response.ok({ data: { users } })
  }

  async updateUserManager({ params, request, response }: HttpContext) {
    const { mgrId } = await request.validateUsing(updateManagerValidator)

    const user = await User.find(params.id)
    if (!user) {
      return response.notFound({ message: 'User not found' })
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

  async listFnRoles({ response }: HttpContext) {
    const fnRoles = await FnRole.query()
      .select('id', 'fnid', 'roleno', 'role_name')
      .preload('fn')
      .orderBy('fnid', 'asc')
      .orderBy('roleno', 'asc')

    const result = fnRoles.map((r) => ({
      id: r.id,
      fnid: r.fnid,
      fnName: r.fn?.fn_name ?? '',
      roleno: r.roleno,
      roleName: r.role_name,
    }))

    return response.ok({ data: { fnRoles: result } })
  }

  async listEmpDataForInvite({ response }: HttpContext) {
    // Return employees who haven't been registered yet
    const registeredEmails = await User.query().select('email')
    const emailSet = new Set(registeredEmails.map((u) => u.email.toLowerCase()))

    const employees = await EmpData.query().orderBy('email', 'asc')
    const unregistered = employees.filter((e) => !emailSet.has(e.email.toLowerCase()))

    return response.ok({ data: { empData: unregistered } })
  }

  async sendInvitations({ request, response }: HttpContext) {
    const { invitations } = await request.validateUsing(inviteEmployeesValidator)
    const appUrl = env.get('APP_URL', 'http://localhost:3333')

    const results: { email: string; status: string }[] = []

    for (const inv of invitations) {
      const empData = await EmpData.find(inv.empDataId)
      if (!empData) {
        results.push({ email: `ID ${inv.empDataId}`, status: 'Employee not found' })
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
}
