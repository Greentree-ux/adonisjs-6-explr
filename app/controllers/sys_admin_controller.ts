import User from '#models/user'
import AppRole from '#models/app_role'
import Co from '#models/co'
import EmpData from '#models/emp_data'
import env from '#start/env'
import mail from '@adonisjs/mail/services/main'
import { createOrgAdminValidator, deleteOrgAdminsValidator } from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'

export default class SysAdminController {
  async createOrgAdmin({ request, response }: HttpContext) {
    const data = await request.validateUsing(createOrgAdminValidator)

    const orgAdminRole = await AppRole.findBy('rName', 'org_admin')
    if (!orgAdminRole) {
      return response.internalServerError({ message: 'org_admin role not found in database' })
    }

    const company = await Co.find(data.coId)
    if (!company) {
      return response.notFound({ message: 'Selected company was not found' })
    }

    // Check if user already exists
    const existingUser = await User.findBy('email', data.email.trim().toLowerCase())
    if (existingUser) {
      return response.conflict({ message: 'A user with this email already exists' })
    }

    // Add to emp_data if not already there
    const existingEmpData = await EmpData.findBy('email', data.email.trim().toLowerCase())
    if (!existingEmpData) {
      await EmpData.create({
        coId: data.coId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName ?? null,
      })
    } else if (existingEmpData.coId !== data.coId) {
      return response.conflict({
        message: 'This email already exists in employee data for another company',
      })
    }

    // Create the Org Admin user with mustChangePassword = true
    const user = await User.create({
      coId: data.coId,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      approleId: orgAdminRole.id,
      mustChangePassword: true,
      empId: 0,
      mgrId: 0,
    })

    const appUrl = env.get('APP_URL', 'http://localhost:3333')
    const loginUrl = `${appUrl}/login`
    let emailSent = true

    try {
      await mail.send((message) => {
        message
          .to(user.email)
          .subject('Your Org Admin Account Has Been Created')
          .html(
            `
            <h1>Org Admin Account Created</h1>
            <p>Hello ${user.firstName},</p>
            <p>An Org Admin account has been created for you for <strong>${company.coName}</strong>.</p>
            <p>You can sign in to the application using the link below:</p>
            <p><a href="${loginUrl}">Go to Login Page</a></p>
            <p><strong>Login email:</strong> ${user.email}</p>
            <p><strong>Initial password:</strong> ${data.password}</p>
            <p>Your initial password has been set by the system administrator. You will be prompted to change it after your first login.</p>
            <p>For security, please sign in promptly and change this password immediately.</p>
          `.trim()
          )
      })
    } catch {
      emailSent = false
    }

    return response.created({
      message: emailSent
        ? 'Org Admin created successfully. A login email has been sent, and they must change their password on first login.'
        : 'Org Admin created successfully, but the login email could not be sent. They must change their password on first login.',
      data: {
        user: {
          id: user.id,
          coId: user.coId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    })
  }

  async listOrgAdmins({ request, response }: HttpContext) {
    const orgAdminRole = await AppRole.findBy('rName', 'org_admin')
    const companies = await Co.query().select('id', 'coName').orderBy('coName', 'asc')

    const requestedCoId = Number(request.input('coId'))
    const selectedCoId = companies.some((company) => company.id === requestedCoId)
      ? requestedCoId
      : (companies[0]?.id ?? null)

    if (!orgAdminRole) {
      return response.ok({ data: { companies, selectedCoId, orgAdmins: [] } })
    }

    const orgAdmins = selectedCoId
      ? await User.query()
          .where('approleId', orgAdminRole.id)
          .where('coId', selectedCoId)
          .select('id', 'coId', 'email', 'firstName', 'lastName', 'createdAt')
          .orderBy('createdAt', 'desc')
      : []

    return response.ok({ data: { companies, selectedCoId, orgAdmins } })
  }

  async deleteOrgAdmins({ request, response }: HttpContext) {
    const data = await request.validateUsing(deleteOrgAdminsValidator)

    const orgAdminRole = await AppRole.findBy('rName', 'org_admin')
    if (!orgAdminRole) {
      return response.internalServerError({ message: 'org_admin role not found in database' })
    }

    const company = await Co.find(data.coId)
    if (!company) {
      return response.notFound({ message: 'Selected company was not found' })
    }

    const orgAdmins = await User.query()
      .where('approleId', orgAdminRole.id)
      .where('coId', data.coId)
      .whereIn('id', data.userIds)
      .select('id')

    if (orgAdmins.length !== data.userIds.length) {
      return response.badRequest({ message: 'One or more selected Org Admins could not be found' })
    }

    await User.query().whereIn('id', data.userIds).delete()

    return response.ok({
      message:
        data.userIds.length === 1
          ? 'Org Admin deleted successfully.'
          : `${data.userIds.length} Org Admins deleted successfully.`,
    })
  }
}
