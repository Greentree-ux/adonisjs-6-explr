import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import Fn from './fn.js'
import FnCat from './fn_cat.js'
import FnCap from './fn_cap.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Subfn extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fnid: number

  @column()
  declare subfnid: number

  @column()
  declare fncatid: number

  @column()
  declare subfnName: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Fn, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare fn: BelongsTo<typeof Fn>

  @belongsTo(() => FnCat, {
    foreignKey: 'fncatid',
    localKey: 'id',
  })
  declare fnCategory: BelongsTo<typeof FnCat>

  async getFnCap() {
    // eslint-disable-next-line prettier/prettier
    return await FnCap.query()
      .where('fnid', this.fnid)
      .where('subfnid', this.subfnid)
      .first()
  }
}
