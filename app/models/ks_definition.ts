import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import FnRole from './fn_role.js'
import KsFramework from './ks_framework.js'
import TaskskillMap from './taskskill_map.js'

export default class KsDefinition extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fnid: number

  @column()
  declare catid: number

  @column()
  declare catord: number

  @column()
  declare roleno: number

  @column()
  declare ksdefinition: string | null

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

  async getKsFramework() {
    return await KsFramework.query()
      .where('fnid', this.fnid)
      .where('catid', this.catid)
      .where('catord', this.catord)
      .first()
  }
  // @belongsTo(() => KsFramework, {
  //   foreignKey: 'fnid',
  //   localKey: 'fnid',
  // })
  // declare ksFramework: BelongsTo<typeof KsFramework>

  async getAllTaskskillMaps() {
    return await TaskskillMap.query()
      .where('ksid01', this.id)
      .orWhere('ksid02', this.id)
      .orWhere('ksid03', this.id)
      .orWhere('ksid04', this.id)
      .orWhere('ksid05', this.id)
      .orWhere('ksid06', this.id)
      .orWhere('ksid07', this.id)
      .orWhere('ksid08', this.id)
      .orWhere('ksid09', this.id)
      .orWhere('ksid10', this.id)
      .orWhere('ksid11', this.id)
      .orWhere('ksid12', this.id)
  }

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid01',
  //   localKey: 'id',
  // })
  // declare taskskillMaps01: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid02',
  //   localKey: 'id',
  // })
  // declare taskskillMaps02: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid03',
  //   localKey: 'id',
  // })
  // declare taskskillMaps03: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid04',
  //   localKey: 'id',
  // })
  // declare taskskillMaps04: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid05',
  //   localKey: 'id',
  // })
  // declare taskskillMaps05: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid06',
  //   localKey: 'id',
  // })
  // declare taskskillMaps06: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid07',
  //   localKey: 'id',
  // })
  // declare taskskillMaps07: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid08',
  //   localKey: 'id',
  // })
  // declare taskskillMaps08: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid09',
  //   localKey: 'id',
  // })
  // declare taskskillMaps09: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid10',
  //   localKey: 'id',
  // })
  // declare taskskillMaps10: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid11',
  //   localKey: 'id',
  // })
  // declare taskskillMaps11: HasMany<typeof TaskskillMap>

  // @hasMany(() => TaskskillMap, {
  //   foreignKey: 'ksid12',
  //   localKey: 'id',
  // })
  // declare taskskillMaps12: HasMany<typeof TaskskillMap>
}
