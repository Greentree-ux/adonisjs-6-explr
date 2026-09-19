import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class LearningPeriod extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare coId: number

  @column()
  declare sequence: number

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare endedAt: DateTime | null

  @column()
  declare createdByUserId: number | null

  @column()
  declare activatedByUserId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}