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

  /**
   * The foreign key MUST be named explicitly. Lucid derives it from the
   * RELATED model's name, so the default here is "developmentPlanId", which no
   * model in this group declares — the column is "plan_id". Without this the
   * relation throws E_MISSING_MODEL_ATTRIBUTE the first time it is preloaded,
   * and TypeScript cannot catch it because the name is resolved at runtime.
   */
  @belongsTo(() => DevelopmentPlan, { foreignKey: 'planId' })
  declare plan: BelongsTo<typeof DevelopmentPlan>
}