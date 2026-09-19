import { DateTime } from 'luxon'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Hash from '@adonisjs/core/services/hash'
import { BaseModel, beforeSave, belongsTo, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import AppRole from './app_role.js'
import Co from './co.js'
import FnRole from './fn_role.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

const AuthFinder = withAuthFinder(() => Hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare approleId: number | null

  @column()
  declare coId: number | null

  @column()
  declare fnroleId: number | null

  @column()
  declare empId: number

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string | null

  @column()
  declare mgrId: number

  @column.date({ columnName: 'date_of_joining' })
  declare dateOfJoining: DateTime | null

  @column.date({ columnName: 'last_role_change' })
  declare lastRoleChange: DateTime | null

  @column()
  declare mustChangePassword: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeSave()
  static normalizeEmail(user: User) {
    if (user.email) {
      user.email = user.email.trim().toLowerCase()
    }
  }

  @belongsTo(() => AppRole, {
    foreignKey: 'approleId',
  })
  declare approle: BelongsTo<typeof AppRole>

  @belongsTo(() => Co, {
    foreignKey: 'coId',
  })
  declare co: BelongsTo<typeof Co>

  @belongsTo(() => FnRole, {
    foreignKey: 'fnroleId',
  })
  declare fnrole: BelongsTo<typeof FnRole>

  static rememberMeTokens = DbRememberMeTokensProvider.forModel(User)
}
