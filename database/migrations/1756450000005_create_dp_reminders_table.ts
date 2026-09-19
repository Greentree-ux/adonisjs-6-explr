import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dp_reminders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('action_plan_id').unsigned().references('dp_action_plans.id').onDelete('CASCADE').notNullable()
      table.enum('remind_ref', ['start_date', 'milestone_1', 'milestone_2', 'completion_date']).notNullable()
      table.integer('remind_days').unsigned().notNullable()
      table.enum('remind_before_after', ['before', 'after']).defaultTo('before').notNullable()
      table.enum('remind_via', ['email', 'in_app', 'both']).defaultTo('email').notNullable()
      table.enum('repeat_period', ['once', 'weekly']).defaultTo('once').notNullable()
      table.json('recipient_list').notNullable()
      table.timestamp('last_sent_at', { useTz: true }).nullable()
      table.timestamp('next_scheduled_at', { useTz: true }).nullable()
      table.integer('repeat_count').unsigned().defaultTo(0)
      table.boolean('is_active').defaultTo(true)
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
