import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'learning_periods'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('co_id').unsigned().references('cos.id').onDelete('CASCADE').notNullable()
      table.integer('sequence').unsigned().notNullable()
      table.timestamp('started_at', { useTz: true }).notNullable()
      table.timestamp('ended_at', { useTz: true }).nullable()
      table.integer('created_by_user_id').unsigned().references('users.id').onDelete('SET NULL').nullable()
      table.integer('activated_by_user_id').unsigned().references('users.id').onDelete('SET NULL').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['co_id', 'sequence'])
      table.index(['co_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}