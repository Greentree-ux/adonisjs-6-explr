import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'assessment_submissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.string('cycle_year', 16).notNullable()
      table
        .integer('subject_user_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')
      table.integer('manager_emp_id').nullable()
      table
        .integer('fnrole_id')
        .unsigned()
        .nullable()
        .references('fn_roles.id')
        .onDelete('SET NULL')
      table.jsonb('payload').notNullable()
      table.timestamp('self_submitted_at').nullable()
      table.timestamp('manager_submitted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['cycle_year', 'subject_user_id'])
      table.index(['manager_emp_id'])
      table.index(['self_submitted_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
