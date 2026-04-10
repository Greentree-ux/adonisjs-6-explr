import vine from '@vinejs/vine'

export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string().minLength(8),
    newPassword: vine.string().minLength(8).confirmed({ confirmationField: 'newPassword_confirmation' }),
  })
)

export const createOrgAdminValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    password: vine.string().minLength(8),
    firstName: vine.string().trim().minLength(2),
    lastName: vine.string().trim().optional(),
  })
)

export const allowedEmailValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
  })
)

export const updateManagerValidator = vine.compile(
  vine.object({
    mgrId: vine.number(),
  })
)
