import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dp_other_skills'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('plan_id')
        .unsigned()
        .references('development_plans.id')
        .onDelete('CASCADE')
        .notNullable()
      table.integer('sequence').unsigned().notNullable()
      table.string('knowledge_skill_type', 50).notNullable()
      table.string('ks_category', 255).notNullable()
      table.string('ks_name', 255).notNullable()
      table.text('ks_definition').notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      table.unique(['plan_id', 'sequence'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
