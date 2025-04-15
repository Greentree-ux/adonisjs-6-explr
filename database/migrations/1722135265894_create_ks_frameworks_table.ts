import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ks_frameworks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('fnid').unsigned().references('fns.id').notNullable()
      table.integer('catid').unsigned().references('ks_cats.id').notNullable()
      table.integer('catord').unsigned().notNullable()
      table.string('ksname', 50).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
