import User from '#models/user'
import AppRole from '#models/app_role'
import AllowedEmail from '#models/allowed_email'
import PasswordReset from '#models/password_reset'
import {
  loginValidator,
  registerValidator,
  requestPasswordResetValidator,
  resetPasswordValidator,
} from '#validators/auth'
import { changePasswordValidator } from '#validators/admin'
import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)

    // Check email is in the allowed list
    const allowed = await AllowedEmail.findBy('email', data.email.trim().toLowerCase())
    if (!allowed) {
      return response.forbidden({
        message: 'This email is not authorized to register. Contact your Org Admin.',
      })
    }

    // Default role = 'user'
    let approleId = data.approleId ?? null
    if (!approleId) {
      const userRole = await AppRole.findBy('rName', 'user')
      approleId = userRole?.id ?? null
    }

    const user = await User.create({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      empId: data.empId,
      mgrId: data.mgrId,
      approleId,
      fnroleId: data.fnroleId,
    })
    return response.created({
      message: 'User registered successfully',
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

  async login({ request, response, auth }: HttpContext) {
    const { email, password, rememberMe } = await request.validateUsing(loginValidator)

    // Check email is in the allowed list
    const allowed = await AllowedEmail.findBy('email', email.trim().toLowerCase())
    if (!allowed) {
      return response.forbidden({
        message: 'This email is not authorized to log in. Contact your Org Admin.',
      })
    }

    const user = await User.verifyCredentials(email, password)

    await auth.use('web').login(user, rememberMe || false)

    // Load role for the response
    let roleName: string | null = null
    if (user.approleId) {
      const role = await AppRole.find(user.approleId)
      roleName = role?.rName ?? null
    }

    return response.ok({
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          mustChangePassword: user.mustChangePassword,
          role: roleName,
        },
      },
    })
  }

  async logout({ response, auth }: HttpContext) {
    await auth.use('web').logout()

    return response.ok({ message: 'Logout successful' })
  }

  async me({ response, auth }: HttpContext) {
    await auth.check()

    const user = auth.user

    if (!user) {
      return response.unauthorized({ message: 'Not authenticated' })
    }

    // Load role
    let roleName: string | null = null
    if (user.approleId) {
      const role = await AppRole.find(user.approleId)
      roleName = role?.rName ?? null
    }

    return response.ok({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          mustChangePassword: user.mustChangePassword,
          role: roleName,
        },
      },
    })
  }

  async changePassword({ request, response, auth }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ message: 'Not authenticated' })
    }

    const { currentPassword, newPassword } = await request.validateUsing(changePasswordValidator)

    // Verify current password
    try {
      await User.verifyCredentials(user.email, currentPassword)
    } catch {
      return response.badRequest({ message: 'Current password is incorrect' })
    }

    user.password = newPassword
    user.mustChangePassword = false
    await user.save()

    return response.ok({ message: 'Password changed successfully' })
  }

  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(requestPasswordResetValidator)

    // Always return success to prevent email enumeration
    const successMessage =
      'If an account with that email exists, you will receive a password reset link shortly.'

    const user = await User.findBy('email', email.toLowerCase())
    if (!user) {
      return response.ok({ message: successMessage })
    }

    const passwordReset = await PasswordReset.createForEmail(email)

    // Build reset URL for the frontend
    const appUrl = env.get('APP_URL', 'http://localhost:3333')
    const resetUrl = `${appUrl}/reset-password?token=${passwordReset.token}&email=${encodeURIComponent(email)}`

    // Send email
    await mail.send((message) => {
      message
        .to(email)
        .subject('Reset Your Password')
        .html(
          `
          <h1>Password Reset Request</h1>
          <p>Hello ${user.firstName},</p>
          <p>You requested to reset your password. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `.trim()
        )
    })

    return response.ok({ message: successMessage })
  }

  async resetPassword({ request, response }: HttpContext) {
    const { email, token, password } = await request.validateUsing(resetPasswordValidator)

    const passwordReset = await PasswordReset.findValidToken(email, token)
    if (!passwordReset) {
      return response.badRequest({
        message: 'Invalid or expired password reset token.',
      })
    }

    const user = await User.findBy('email', email.toLowerCase())
    if (!user) {
      return response.badRequest({
        message: 'Invalid or expired password reset token.',
      })
    }

    // Update password (AuthFinder mixin will hash it)
    user.password = password
    await user.save()

    // Delete the used token
    await passwordReset.delete()

    return response.ok({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    })
  }
}
