import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dp_focus_skills_target'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('plan_id').unsigned().references('development_plans.id').onDelete('CASCADE').notNullable()
      table.integer('ks_id').unsigned().references('ks_definitions.id').notNullable()
      table.integer('sequence').unsigned().notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.unique(['plan_id', 'ks_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
