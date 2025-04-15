import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ks_cats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.string('ks', 3).notNullable()
      table.index('ks', 'ks_index')
      table.string('k_ss_gs', 20).notNullable()
      table.integer('catseq').notNullable()
      table.string('kscategory', 50).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
