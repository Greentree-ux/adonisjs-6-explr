import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import DpActionPlan from './dp_action_plan.js'

export interface ReminderRecipient {
  type: 'employee' | 'manager' | 'both'
}

export type ReminderRepeatPeriod = 'once' | 'custom'
export type ReminderRepeatUnit = 'days' | 'weeks' | 'months'

export default class DpReminder extends BaseModel {
  static table = 'dp_reminders'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare actionPlanId: number

  @column()
  declare remindRef: 'start_date' | 'milestone_1' | 'milestone_2' | 'completion_date'

  @column()
  declare remindDays: number

  @column()
  declare remindBeforeAfter: 'before' | 'after'

  @column()
  declare remindVia: 'email' | 'in_app' | 'both'

  @column()
  declare repeatPeriod: ReminderRepeatPeriod

  @column()
  declare repeatEvery: number | null

  @column()
  declare repeatUnit: ReminderRepeatUnit | null

  @column()
  declare recipientList: ReminderRecipient | null

  @column.dateTime()
  declare lastSentAt: DateTime | null

  @column.dateTime()
  declare nextScheduledAt: DateTime | null

  @column()
  declare repeatCount: number

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => DpActionPlan, {
    foreignKey: 'actionPlanId',
  })
  declare actionPlan: BelongsTo<typeof DpActionPlan>
}
