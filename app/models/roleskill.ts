import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import FnFnrole from './fn_fnrole.js'
import FnRole from './fn_role.js'

export default class Roleskill extends BaseModel {
  @column({ isPrimary: true })
  declare fnid: number

  @column()
  declare fn_name: string

  @column()
  declare catid: number

  @column()
  declare k_ss_gs: string

  @column()
  declare catseq: number

  @column()
  declare kscategory: string

  @column()
  declare catord: number

  @column()
  declare ksname: string

  @column()
  declare roleno: number

  @column()
  declare role_name: string

  @column()
  declare ksid: number

  @column()
  declare ksdefinition: string

  @belongsTo(() => FnFnrole, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare fnFnroleskillByFnid: BelongsTo<typeof FnFnrole>

  async getFnFnroleskill() {
    // eslint-disable-next-line prettier/prettier
      return await FnFnrole.query()
      .where('fnid', this.fnid)
      .where('roleno', this.roleno)
      .first()
  }
  async getfnfnroleskills() {
    return this.getFnFnroleskill()
  }

  async getFnRole() {
    // eslint-disable-next-line prettier/prettier
    return await FnRole.query()
      .where('fnid', this.fnid)
      .where('roleno', this.roleno)
      .first()
  }
}
