import { DateTime } from 'luxon'
import { BaseModel, beforeSave, column } from '@adonisjs/lucid/orm'

export default class EmpData extends BaseModel {
  static table = 'emp_data'

  @column({ isPrimary: true })
  declare id: number

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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeSave()
  static normalizeEmail(empData: EmpData) {
    if (empData.email) {
      empData.email = empData.email.trim().toLowerCase()
    }
  }
}
