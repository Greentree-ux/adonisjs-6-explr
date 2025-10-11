import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('empId').unsigned().nullable()
      table.string('department').nullable()
      table.string('subDept').nullable()
      table.string('title').nullable()
      table.integer('mgrId').unsigned().nullable()
      table.string('mgrEmail', 254).nullable()
      table.string('mgrFirstName').nullable()
      table.string('mgrLastName').nullable()
      table.string('mgrTitle').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('empId')
      table.dropColumn('department')
      table.dropColumn('subDept')
      table.dropColumn('title')
      table.dropColumn('mgrId')
      table.dropColumn('mgrEmail')
      table.dropColumn('mgrFirstName')
      table.dropColumn('mgrLastName')
      table.dropColumn('mgrTitle')
    })
  }
}
