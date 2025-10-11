import { DateTime } from 'luxon'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Hash from '@adonisjs/core/services/hash'
import { BaseModel, beforeSave, belongsTo, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import AppRole from './app_role.js'
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
  declare fnroleId: number | null

  @column()
  declare empId: number

  @column()
  declare email: string

  @column()
  declare password: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string | null

  @column()
  declare department: string

  @column()
  declare subDept: string | null

  @column()
  declare title: string | null

  @column()
  declare mgrId: number

  @column()
  declare mgrEmail: string

  @column()
  declare mgrFirstName: string

  @column()
  declare mgrLastName: string | null

  @column()
  declare mgrTitle: string | null

  @column()
  declare rememberMeToken: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeSave()
  static normalizeEmail(user: User) {
    user.email = user.email.trim().toLowerCase()
  }

  @belongsTo(() => AppRole, {
    foreignKey: 'approleId',
  })
  declare approle: BelongsTo<typeof AppRole>

  @belongsTo(() => FnRole, {
    foreignKey: 'fnroleId',
  })
  declare fnrole: BelongsTo<typeof FnRole>
}
