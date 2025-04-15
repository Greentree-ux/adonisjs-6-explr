import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ks_definitions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('fnid').unsigned().notNullable()
      table.integer('catid').unsigned().notNullable()
      table.integer('catord').unsigned().notNullable()
      table.integer('roleno').unsigned().notNullable()
      table.string('ksdefinition', 400).nullable
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
