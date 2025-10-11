import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Fn from './fn.js'
import KsDefinition from './ks_definition.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class KsFramework extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fnid: number

  @column()
  declare catid: number

  @column()
  declare catord: number

  @column()
  declare ksname: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Fn, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare fn: BelongsTo<typeof Fn>

  @hasMany(() => KsDefinition, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare ksDefinitions: HasMany<typeof KsDefinition>
}
