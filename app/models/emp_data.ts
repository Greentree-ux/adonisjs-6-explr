import { DateTime } from 'luxon'
import { BaseModel, beforeSave, belongsTo, column } from '@adonisjs/lucid/orm'
import Co from './co.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class EmpData extends BaseModel {
  static table = 'emp_data'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare coId: number

  @column()
  declare email: string

  @column()
  declare firstName: string | null

  @column()
  declare lastName: string | null

  @column()
  declare empId: number | null

  @column()
  declare invitationToken: string | null

  @column.dateTime()
  declare invitationSentAt: DateTime | null

  @column()
  declare fnroleId: number | null

  @column()
  declare mgrId: number | null

  @column.date({ columnName: 'date_of_joining' })
  declare dateOfJoining: DateTime | null

  @column.date({ columnName: 'last_role_change' })
  declare lastRoleChange: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Co, {
    foreignKey: 'coId',
  })
  declare co: BelongsTo<typeof Co>

  @beforeSave()
  static normalizeEmail(empData: EmpData) {
    if (empData.email) {
      empData.email = empData.email.trim().toLowerCase()
    }
  }
}
