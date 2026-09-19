import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import DpFocusSkillsProficiency from './dp_focus_skills_proficiency.js'
import DpTargetRole from './dp_target_role.js'
import DpFocusSkillsTarget from './dp_focus_skills_target.js'
import DpActionPlan from './dp_action_plan.js'
import DpOtherSkill from './dp_other_skill.js'

export default class DevelopmentPlan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare cycleYear: number

  @column()
  declare learningPeriodId: number

  @column()
  declare userStatus: 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | 'stage_5' | 'completed'

  @column()
  declare managerStatus:
    | 'notSubmitted'
    | 'stage_1'
    | 'stage_2'
    | 'stage_3'
    | 'stage_4'
    | 'stage_5'
    | 'approved'

  @column.dateTime()
  declare userSubmittedAt: DateTime | null

  @column.dateTime()
  declare managerSubmittedAt: DateTime | null

  @column.dateTime()
  declare exportedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => DpFocusSkillsProficiency)
  declare focusSkillsProficiency: HasMany<typeof DpFocusSkillsProficiency>

  @hasMany(() => DpTargetRole)
  declare targetRoles: HasMany<typeof DpTargetRole>

  @hasMany(() => DpFocusSkillsTarget)
  declare focusSkillsTarget: HasMany<typeof DpFocusSkillsTarget>

  @hasMany(() => DpActionPlan)
  declare actionPlans: HasMany<typeof DpActionPlan>

  @hasMany(() => DpOtherSkill)
  declare otherSkills: HasMany<typeof DpOtherSkill>
}
