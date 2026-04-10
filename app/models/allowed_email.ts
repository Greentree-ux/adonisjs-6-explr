import { DateTime } from 'luxon'
import { BaseModel, beforeSave, column } from '@adonisjs/lucid/orm'

export default class AllowedEmail extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeSave()
  static normalizeEmail(allowedEmail: AllowedEmail) {
    if (allowedEmail.email) {
      allowedEmail.email = allowedEmail.email.trim().toLowerCase()
    }
  }
}
