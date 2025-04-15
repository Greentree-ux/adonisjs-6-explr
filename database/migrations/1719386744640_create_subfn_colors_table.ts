import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subfn_colors'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('fncatid').unsigned().references('fn_cats.id').notNullable()
      table.integer('colno').unsigned().notNullable()
      table.string('subfncolor', 30).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
