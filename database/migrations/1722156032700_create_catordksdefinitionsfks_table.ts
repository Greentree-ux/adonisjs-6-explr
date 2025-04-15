import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('ks_definitions', (table) => {
      table
        .foreign(['fnid', 'catid', 'catord'], 'catordksdefinitionsfk')
        .references(['fnid', 'catid', 'catord'])
        .inTable('ks_frameworks')
    })
  }

  async down() {
    this.schema.alterTable('ks_definitions', (table) => {
      table.dropForeign(['fnid', 'catid', 'catord'], 'catordksdefinitionsfk')
    })
  }
}
