import User from '#models/user'
import AppRole from '#models/app_role'
import EmpData from '#models/emp_data'
import { createOrgAdminValidator } from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'

export default class SysAdminController {
  async createOrgAdmin({ request, response }: HttpContext) {
    const data = await request.validateUsing(createOrgAdminValidator)

    const orgAdminRole = await AppRole.findBy('rName', 'org_admin')
    if (!orgAdminRole) {
      return response.internalServerError({ message: 'org_admin role not found in database' })
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
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName ?? null,
      })
    }

    // Create the Org Admin user with mustChangePassword = true
    const user = await User.create({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      approleId: orgAdminRole.id,
      mustChangePassword: true,
      empId: 0,
      mgrId: 0,
    })

    return response.created({
      message: 'Org Admin created successfully. They must change their password on first login.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    })
  }

  async listOrgAdmins({ response }: HttpContext) {
    const orgAdminRole = await AppRole.findBy('rName', 'org_admin')
    if (!orgAdminRole) {
      return response.ok({ data: { orgAdmins: [] } })
    }

    const orgAdmins = await User.query()
      .where('approleId', orgAdminRole.id)
      .select('id', 'email', 'firstName', 'lastName', 'createdAt')
      .orderBy('createdAt', 'desc')

    return response.ok({ data: { orgAdmins } })
  }
}
