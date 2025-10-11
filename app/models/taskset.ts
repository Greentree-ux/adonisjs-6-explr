import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import FnRole from './fn_role.js'
import FnCap from './fn_cap.js'
import TaskskillMap from './taskskill_map.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Taskset extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fnid: number

  @column()
  declare subfnid: number

  @column()
  declare sub2fnord: number

  @column()
  declare roleno: number

  @column()
  declare taskset: string | null

  @column()
  declare ei: string | null

  @column()
  declare lmh: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  async getFnRole() {
    // eslint-disable-next-line prettier/prettier
    return await FnRole.query()
      .where('fnid', this.fnid)
      .where('roleno', this.roleno)
      .first()
  }
  // @belongsTo(() => FnRole, {
  //   foreignKey: 'fnid',
  //   localKey: 'fnid',
  // })
  // declare fnRole: BelongsTo<typeof FnRole>

  async getFnCap() {
    return await FnCap.query()
      .where('fnid', this.fnid)
      .where('subfnid', this.subfnid)
      .where('sub2fnord', this.sub2fnord)
      .first()
  }

  @hasMany(() => TaskskillMap, {
    foreignKey: 'taskset_id',
    localKey: 'id',
  })
  declare taskskillMaps: HasMany<typeof TaskskillMap>
}
