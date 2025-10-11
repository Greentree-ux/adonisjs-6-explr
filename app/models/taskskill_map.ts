import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import FnRole from './fn_role.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class TaskskillMap extends BaseModel {
  @column({ isPrimary: true })
  declare fnid: number

  @column()
  declare taskid: number

  @column()
  declare roleno: number

  @column()
  declare ksid01: number | null

  @column()
  declare ksid02: number | null

  @column()
  declare ksid03: number | null

  @column()
  declare ksid04: number | null

  @column()
  declare ksid05: number | null

  @column()
  declare ksid06: number | null

  @column()
  declare ksid07: number | null

  @column()
  declare ksid08: number | null

  @column()
  declare ksid09: number | null

  @column()
  declare ksid10: number | null

  @column()
  declare ksid11: number | null

  @column()
  declare ksid12: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => FnRole, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare fnRole: BelongsTo<typeof FnRole>
}
