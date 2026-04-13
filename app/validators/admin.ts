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

export const empDataValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    firstName: vine.string().trim().optional(),
    lastName: vine.string().trim().optional(),
    empId: vine.number().optional(),
  })
)

export const updateManagerValidator = vine.compile(
  vine.object({
    mgrId: vine.number(),
  })
)

export const inviteEmployeesValidator = vine.compile(
  vine.object({
    invitations: vine.array(
      vine.object({
        empDataId: vine.number(),
        fnroleId: vine.number(),
        mgrId: vine.number(),
      })
    ).minLength(1),
  })
)

export const registerByInviteValidator = vine.compile(
  vine.object({
    token: vine.string().trim(),
    password: vine.string().minLength(8).confirmed(),
  })
)
