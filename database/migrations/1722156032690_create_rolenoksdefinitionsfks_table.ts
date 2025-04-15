import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('ks_definitions', (table) => {
      table
        .foreign(['fnid', 'roleno'], 'rolenoksdefinitionsfk')
        .references(['fnid', 'roleno'])
        .inTable('fn_roles')
    })
  }

  async down() {
    this.schema.alterTable('ks_definitions', (table) => {
      table.dropForeign(['fnid', 'roleno'], 'rolenoksdefinitionsfk')
    })
  }
}
