import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DevelopmentPlan from './development_plan.js'
import KsDefinition from './ks_definition.js'

export default class DpFocusSkillsTarget extends BaseModel {
  static table = 'dp_focus_skills_target'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare ksId: number

  @column()
  declare sourceFnid: number | null

  @column()
  declare sourceRoleno: number | null

  @column()
  declare sequence: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => DevelopmentPlan)
  declare plan: BelongsTo<typeof DevelopmentPlan>

  @belongsTo(() => KsDefinition, { foreignKey: 'ksId' })
  declare ksDefinition: BelongsTo<typeof KsDefinition>
}
