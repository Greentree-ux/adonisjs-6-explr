import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import KsFramework from './ks_framework.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class KsCat extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ks: string

  @column()
  declare kSsGs: string

  @column()
  declare catseq: number

  @column()
  declare kscategory: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => KsFramework, {
    foreignKey: 'kscatid',
    localKey: 'id',
  })
  declare ksFrameworks: HasMany<typeof KsFramework>
}
