import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from './user.js'
import FnRole from './fn_role.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class AssessmentSubmission extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare cycleYear: string

  @column()
  declare learningPeriodId: number

  @column()
  declare subjectUserId: number

  @column()
  declare managerEmpId: number | null

  @column()
  declare fnroleId: number | null

  @column()
  declare payload: Record<string, unknown>

  @column.dateTime()
  declare selfSubmittedAt: DateTime | null

  @column.dateTime()
  declare managerSubmittedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'subjectUserId',
  })
  declare subjectUser: BelongsTo<typeof User>

  @belongsTo(() => FnRole, {
    foreignKey: 'fnroleId',
  })
  declare fnrole: BelongsTo<typeof FnRole>
}
