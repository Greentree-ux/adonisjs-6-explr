import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import FnRole from './fn_role.js'
import Roletaskset from './roletaskset.js'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Roleskill from './roleskill.js'

export default class FnFnrole extends BaseModel {
  @column({ isPrimary: true })
  declare fnid: number

  @column()
  declare fn_name: string

  @column()
  declare roleno: number

  @column()
  declare role_name: string

  @hasMany(() => Roletaskset, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare roletasksetsByFnid: HasMany<typeof Roletaskset>

  @hasMany(() => Roleskill, {
    foreignKey: 'fnid',
    localKey: 'fnid',
  })
  declare roleskillsByFnid: HasMany<typeof Roleskill>

  async getRoletasksets() {
    // eslint-disable-next-line prettier/prettier
    return await Roletaskset.query()
      .where('fnid', this.fnid)
      .where('roleno', this.roleno)
  }

  async getroletasksets() {
    return this.getRoletasksets()
  }

  async getRoleskills() {
    // eslint-disable-next-line prettier/prettier
    return await Roleskill.query()
      .where('fnid', this.fnid)
      .where('roleno', this.roleno)
  }

  async getroleskills() {
    return this.getRoleskills()
  }

  async getFnRole() {
    // eslint-disable-next-line prettier/prettier
    return await FnRole.query()
      .where('fnid', this.fnid)
      .where('roleno', this.roleno)
      .first()
  }
}
