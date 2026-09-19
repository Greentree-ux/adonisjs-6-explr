import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Co from './co.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class AccessPolicy extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare coId: number

  @column()
  declare levelRestriction: number | null

  @column()
  declare functionScope: 'same_function' | 'same_location' | 'same_business' | 'same_company'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Co, {
    foreignKey: 'coId',
  })
  declare co: BelongsTo<typeof Co>
}
