import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('taskskill_maps', (table) => {
      table
        .foreign(['fnid', 'roleno'], 'rolenotaskskillmapfk')
        .references(['fnid', 'roleno'])
        .inTable('fn_roles')
    })
  }

  async down() {
    this.schema.alterTable('taskskill_maps', (table) => {
      table.dropForeign(['fnid', 'roleno'], 'rolenotaskskillmapfk')
    })
  }
}
