import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import DevelopmentPlan from './development_plan.js'
import DpReminder from './dp_reminder.js'

const normalizeAddressedSkillKey = (value: unknown): string | null => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? String(value) : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed) || /^other:\d+$/.test(trimmed)) {
    return trimmed
  }

  return null
}

export default class DpActionPlan extends BaseModel {
  static table = 'dp_action_plans'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare planId: number

  @column()
  declare sequence: number

  @column()
  declare actionCategory: string

  @column()
  declare taskDescription: string | null

  @column()
  declare successCriteria: string | null

  @column.date()
  declare startDate: DateTime | null

  @column.date()
  declare completionDate: DateTime | null

  @column.date()
  declare milestone1Date: DateTime | null

  @column()
  declare milestone1Text: string | null

  @column.date()
  declare milestone2Date: DateTime | null

  @column()
  declare milestone2Text: string | null

  @column()
  declare progressNotes: string | null

  @column({
    columnName: 'addressed_skills_ids',
    prepare: (value: string[] | null) => {
      if (!Array.isArray(value)) {
        return value === null ? null : JSON.stringify([])
      }

      return JSON.stringify(
        Array.from(new Set(value.map((item) => normalizeAddressedSkillKey(item)).filter(Boolean)))
      )
    },
    consume: (value: unknown) => {
      if (Array.isArray(value)) {
        return Array.from(
          new Set(value.map((item) => normalizeAddressedSkillKey(item)).filter(Boolean))
        )
      }

      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed)
            ? Array.from(
                new Set(parsed.map((item) => normalizeAddressedSkillKey(item)).filter(Boolean))
              )
            : []
        } catch {
          return []
        }
      }

      return []
    },
  })
  declare addressedSkillsIds: string[] | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => DevelopmentPlan)
  declare plan: BelongsTo<typeof DevelopmentPlan>

  @hasMany(() => DpReminder, {
    foreignKey: 'actionPlanId',
  })
  declare reminders: HasMany<typeof DpReminder>
}
