import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Subfn from './subfn.js'
import SubfnColor from './subfn_color.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class FnCat extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare Fncategory: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Subfn, {
    foreignKey: 'fncatid',
    localKey: 'id',
  })
  declare subFns: HasMany<typeof Subfn>

  @hasMany(() => SubfnColor, {
    foreignKey: 'fncatid',
    localKey: 'id',
  })
  declare subFnColors: HasMany<typeof SubfnColor>
}
