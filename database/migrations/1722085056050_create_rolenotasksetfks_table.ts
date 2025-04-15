import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tasksets', (table) => {
      table
        .foreign(['fnid', 'roleno'], 'rolenotasksetfk')
        .references(['fnid', 'roleno'])
        .inTable('fn_roles')
    })
  }

  async down() {
    this.schema.alterTable('tasksets', (table) => {
      table.dropForeign(['fnid', 'roleno'], 'rolenotasksetfk')
    })
  }
}
