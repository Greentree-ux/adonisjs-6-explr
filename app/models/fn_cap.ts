import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import Subfn from './subfn.js'
import Taskset from './taskset.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class FnCap extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fnid: number

  @column()
  declare subfnid: number

  @column()
  declare sub2fnord: number

  @column()
  declare subSubFnName: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Subfn, {
    foreignKey: 'subfnid',
    localKey: 'subfnid',
  })
  declare subfn: BelongsTo<typeof Subfn>

  @hasMany(() => Taskset, {
    foreignKey: 'fncapid',
    localKey: 'id',
  })
  declare tasksets: HasMany<typeof Taskset>
}
