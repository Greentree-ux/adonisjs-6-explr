import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class KsColor extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ks: string

  @column()
  declare colno: number

  @column()
  declare kscolor: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}