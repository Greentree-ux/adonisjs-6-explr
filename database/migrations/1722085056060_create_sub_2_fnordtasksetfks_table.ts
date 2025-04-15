import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('tasksets', (table) => {
      table
        .foreign(['fnid', 'subfnid', 'sub2fnord'], 'sub2fnordtasksetfk')
        .references(['fnid', 'subfnid', 'sub2fnord'])
        .inTable('fn_caps')
    })
  }

  async down() {
    this.schema.alterTable('tasksets', (table) => {
      table.dropForeign(['fnid', 'subfnid', 'sub2fnord'], 'sub2fnordtasksetfk')
    })
  }
}
