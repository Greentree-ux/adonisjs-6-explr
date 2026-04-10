import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('emp_id').unsigned().nullable()
      table.integer('mgr_id').unsigned().nullable()
      table.dropColumn('remember_me_token')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('emp_id')
      table.dropColumn('mgr_id')
      table.string('remember_me_token', 255).nullable()
    })
  }
}
