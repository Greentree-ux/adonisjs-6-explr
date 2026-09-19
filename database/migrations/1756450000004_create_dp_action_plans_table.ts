import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dp_action_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('plan_id').unsigned().references('development_plans.id').onDelete('CASCADE').notNullable()
      table.integer('sequence').unsigned().notNullable()
      table.string('action_category', 255).notNullable()
      table.text('task_description').nullable()
      table.text('success_criteria').nullable()
      table.date('start_date').nullable()
      table.date('completion_date').nullable()
      table.date('milestone_1_date').nullable()
      table.date('milestone_2_date').nullable()
      table.text('progress_notes').nullable()
      table.json('addressed_skills_ids').nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
