import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fn_roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('fnid').unsigned().references('fns.id').notNullable()
      table.integer('wlevelid').unsigned().references('wlevels.id').notNullable()
      table.integer('roleno').unsigned().notNullable()
      table.unique(['fnid', 'roleno'], 'rolenofnrolesidx')
      table.string('role_name', 100).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
