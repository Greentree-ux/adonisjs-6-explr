import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fn_cats'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.string('fncategory', 50).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
