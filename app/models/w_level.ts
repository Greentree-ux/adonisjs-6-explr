import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import FnRole from './fn_role.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class WLevel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ord: number

  @column()
  declare WlevelNo: string

  @column()
  declare hml: string

  @column()
  declare descr: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => FnRole, {
    foreignKey: 'wlevelid',
  })
  declare fnRoles: HasMany<typeof FnRole>
}
