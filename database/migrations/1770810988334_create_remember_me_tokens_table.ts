import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'remember_me_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('tokenable_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('hash', 255).notNullable().unique()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()

      // Index for faster lookups
      table.index(['tokenable_id'])
      table.index(['hash'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
