import EmpData from '#models/emp_data'
import User from '#models/user'
import { empDataValidator, updateManagerValidator } from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'

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
}
