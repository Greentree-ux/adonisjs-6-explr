import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Fn from './fn.js'
import WLevel from './w_level.js'
import User from './user.js'
import Taskset from './taskset.js'
import KsDefinition from './ks_definition.js'
import TaskskillMap from './taskskill_map.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class FnRole extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fnid: number

  @column()
  declare wlevelid: number

  @column()
  declare roleno: number

  @column()
  declare role_name: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Fn, {
    foreignKey: 'fnid',
  })
  declare fn: BelongsTo<typeof Fn>

  @belongsTo(() => WLevel, {
    foreignKey: 'wlevelid',
  })
  declare wlevel: BelongsTo<typeof WLevel>

  @hasMany(() => User, {
    foreignKey: 'fnroleid',
  })
  declare users: HasMany<typeof User>

  @hasMany(() => Taskset, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare tasksetsByFnid: HasMany<typeof Taskset>

  @hasMany(() => KsDefinition, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare ksdefinitionByFnid: HasMany<typeof KsDefinition>

  @hasMany(() => TaskskillMap, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare taskskillMaps: HasMany<typeof TaskskillMap>
}
