import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('emp_data', (table) => {
      table.string('invitation_token', 255).nullable().unique()
      table.timestamp('invitation_sent_at').nullable()
      table.integer('fnrole_id').unsigned().references('fn_roles.id').nullable()
      table.integer('mgr_id').nullable()
    })
  }

  async down() {
    this.schema.alterTable('emp_data', (table) => {
      table.dropColumn('invitation_token')
      table.dropColumn('invitation_sent_at')
      table.dropColumn('fnrole_id')
      table.dropColumn('mgr_id')
    })
  }
}
