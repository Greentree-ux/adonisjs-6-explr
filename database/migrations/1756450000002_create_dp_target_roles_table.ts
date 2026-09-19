import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dp_target_roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('plan_id').unsigned().references('development_plans.id').onDelete('CASCADE').notNullable()
      table.integer('fnid').unsigned().notNullable()
      table.integer('roleno').unsigned().notNullable()
      table.integer('sequence').unsigned().notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.foreign(['fnid', 'roleno']).references(['fnid', 'roleno']).inTable('fn_roles')
      table.unique(['plan_id', 'fnid', 'roleno'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
