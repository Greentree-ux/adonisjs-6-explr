import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tasksets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('fnid').unsigned().notNullable()
      table.integer('subfnid').unsigned().notNullable()
      table.integer('sub2fnord').unsigned().notNullable()
      table.integer('roleno').unsigned().notNullable()
      table.string('taskset', 400).nullable()
      table.string('ei', 1).nullable()
      table.string('lmh', 1).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
