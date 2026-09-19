import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DevelopmentPlan from './development_plan.js'

export default class DpTargetRole extends BaseModel {
  static table = 'dp_target_roles'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare fnid: number

  @column()
  declare roleno: number

  @column()
  declare sequence: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => DevelopmentPlan)
  declare plan: BelongsTo<typeof DevelopmentPlan>
}
