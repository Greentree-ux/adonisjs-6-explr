import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'emp_data'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('date_of_joining').nullable()
      table.date('last_role_change').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('date_of_joining')
      table.dropColumn('last_role_change')
    })
  }
}