import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'development_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().references('users.id').notNullable()
      table.integer('cycle_year').unsigned().notNullable()
      table.enum('user_status', ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5', 'completed']).defaultTo('stage_1')
      table.enum('manager_status', ['notSubmitted', 'stage_1', 'stage_2', 'stage_3', 'stage_4', 'stage_5', 'approved']).defaultTo('notSubmitted')
      table.timestamp('user_submitted_at', { useTz: true }).nullable()
      table.timestamp('manager_submitted_at', { useTz: true }).nullable()
      table.timestamp('exported_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.unique(['user_id', 'cycle_year'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
