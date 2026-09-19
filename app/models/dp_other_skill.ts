import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DevelopmentPlan from './development_plan.js'

export default class DpOtherSkill extends BaseModel {
  static table = 'dp_other_skills'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare sequence: number

  @column()
  declare knowledgeSkillType: string

  @column()
  declare ksCategory: string

  @column()
  declare ksName: string

  @column()
  declare ksDefinition: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => DevelopmentPlan)
  declare plan: BelongsTo<typeof DevelopmentPlan>
}