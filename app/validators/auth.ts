import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    password: vine.string().minLength(8).confirmed(),
    firstName: vine.string().trim().minLength(2),
    lastName: vine.string().trim().optional(),
    empId: vine.number().optional(),
    mgrId: vine.number().optional(),
    approleId: vine.number().optional(),
    fnroleId: vine.number().optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    password: vine.string().minLength(8),
    rememberMe: vine.boolean().optional(),
  })
)

export const resetPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    token: vine.string(),
    password: vine.string().minLength(8).confirmed(),
  })
)

export const requestPasswordResetValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
  })
)
