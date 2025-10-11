import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Business from './business.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Co extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare coName: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Business, {
    foreignKey: 'coId',
  })
  declare businesses: HasMany<typeof Business>
}
