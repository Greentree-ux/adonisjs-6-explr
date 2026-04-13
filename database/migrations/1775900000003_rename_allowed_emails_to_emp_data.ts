import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.renameTable('allowed_emails', 'emp_data')

    this.schema.alterTable('emp_data', (table) => {
      table.string('first_name', 255).nullable()
      table.string('last_name', 255).nullable()
      table.integer('emp_id').nullable()
    })
  }

  async down() {
    this.schema.alterTable('emp_data', (table) => {
      table.dropColumn('first_name')
      table.dropColumn('last_name')
      table.dropColumn('emp_id')
    })

    this.schema.renameTable('emp_data', 'allowed_emails')
  }
}
