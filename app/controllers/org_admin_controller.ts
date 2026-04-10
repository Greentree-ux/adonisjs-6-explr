import AllowedEmail from '#models/allowed_email'
import User from '#models/user'
import { allowedEmailValidator, updateManagerValidator } from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'

export default class OrgAdminController {
  // --- Allowed Emails ---

  async listAllowedEmails({ response }: HttpContext) {
    const emails = await AllowedEmail.query().orderBy('email', 'asc')
    return response.ok({ data: { allowedEmails: emails } })
  }

  async addAllowedEmail({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(allowedEmailValidator)

    const existing = await AllowedEmail.findBy('email', email.trim().toLowerCase())
    if (existing) {
      return response.conflict({ message: 'This email is already in the allowed list' })
    }

    const allowedEmail = await AllowedEmail.create({ email })
    return response.created({
      message: 'Email added to allowed list',
      data: { allowedEmail },
    })
  }

  async removeAllowedEmail({ params, response }: HttpContext) {
    const allowedEmail = await AllowedEmail.find(params.id)
    if (!allowedEmail) {
      return response.notFound({ message: 'Allowed email not found' })
    }

    await allowedEmail.delete()
    return response.ok({ message: 'Email removed from allowed list' })
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
