import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import FnRole from './fn_role.js'
import FnFnrole from './fn_fnrole.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Roletaskset extends BaseModel {
  @column({ isPrimary: true })
  declare fnid: number

  @column()
  declare fn_name: string

  @column()
  declare subfnid: number

  @column()
  declare subfn_name: string

  @column({ columnName: 'sub2fnord' })
  declare sub2fnord: number

  @column()
  declare sub_sub_fn_name: string

  @column()
  declare roleno: number

  @column()
  declare role_name: string

  @column()
  declare taskset: string

  @column()
  declare ei: string

  @column()
  declare lmh: string

  @belongsTo(() => FnFnrole, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare fnFnroleByFnid: BelongsTo<typeof FnFnrole>

  async getFnFnrole() {
    // eslint-disable-next-line prettier/prettier
    return await FnFnrole.query()
    .where('fnid', this.fnid)
    .where('roleno', this.roleno)
    .first()
  }

  async getfnfnroles() {
    return this.getFnFnrole()
  }

  async getFnRole() {
    // eslint-disable-next-line prettier/prettier
      return await FnRole.query()
        .where('fnid', this.fnid)
        .where('roleno', this.roleno)
        .first()  }
}
