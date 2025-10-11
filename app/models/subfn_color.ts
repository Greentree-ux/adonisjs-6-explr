import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import FnCat from './fn_cat.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SubfnColor extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare Fncatid: number

  @column()
  declare Colno: number

  @column()
  declare Subfncolor: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => FnCat, {
    foreignKey: 'Fncatid',
    localKey: 'id',
  })
  declare fnCategory: BelongsTo<typeof FnCat>
}
