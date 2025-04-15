import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('ks_frameworks', (table) => {
      table.unique(['fnid', 'catid', 'catord'], 'catordksframeworksidx')
    })
  }

  async down() {
    this.schema.alterTable('ks_frameworks', (table) => {
      table.dropUnique(['fnid', 'catid', 'catord'], 'catordksframeworksidx')
    })
  }
}
