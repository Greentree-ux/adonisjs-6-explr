import { DateTime } from 'luxon'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'

const AuthFinder = withAuthFinder(hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

// eslint-disable-next-line prettier/prettier
export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare approleId: number | null

  @column()
  declare fnroleId: number | null

  @column()
  declare firstName: string

  @column()
  declare lastName: string | null

  @column()
  declare email: string

  @column()
  declare password: string

  @column()
  declare rememberMeToken: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
