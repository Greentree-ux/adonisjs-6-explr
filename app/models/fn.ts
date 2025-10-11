import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Loc from './loc.js'
import FnRole from './fn_role.js'
import Subfn from './subfn.js'
import KsFramework from './ks_framework.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Fn extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare locId: number

  @column({ columnName: 'fn_name' })
  declare fnName: string

  @column({ columnName: 'fnname_full' })
  declare fnNameFull: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Loc, {
    foreignKey: 'locId',
  })
  declare loc: BelongsTo<typeof Loc>

  @hasMany(() => FnRole, {
    foreignKey: 'fnId',
  })
  declare fnRoles: HasMany<typeof FnRole>

  @hasMany(() => Subfn, {
    foreignKey: 'fnId',
  })
  declare subFns: HasMany<typeof Subfn>

  @hasMany(() => KsFramework, {
    foreignKey: 'fnId',
  })
  declare ksFrameworks: HasMany<typeof KsFramework>
}
