import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class LearningPeriodResetRequest extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare coId: number

  @column()
  declare firstApproverUserId: number

  @column()
  declare secondApproverUserId: number | null

  @column()
  declare status: 'pending' | 'completed'

  @column.dateTime()
  declare requestedAt: DateTime

  @column.dateTime()
  declare completedAt: DateTime | null

  @column()
  declare createdPeriodId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}