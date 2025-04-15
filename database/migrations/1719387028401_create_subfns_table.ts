import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subfns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('fnid').unsigned().references('fns.id').notNullable()
      table.integer('subfnid').unsigned().notNullable().defaultTo(1)
      table.unique(['fnid', 'subfnid'], 'fnsubfnidx')
      table.integer('fncatid').unsigned().references('fn_cats.id').notNullable()
      table.string('subfn_name', 50).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
