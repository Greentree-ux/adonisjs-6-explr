import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import Co from './co.js'
import Loc from './loc.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Business extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare coId: number

  @column()
  declare businessName: string

  @column({ columnName: 'businessname_full' })
  declare businessNameFull: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Co, {
    foreignKey: 'coId',
  })
  declare co: BelongsTo<typeof Co>

  @hasMany(() => Loc, {
    foreignKey: 'businessId',
  })
  declare locs: HasMany<typeof Loc>
}
