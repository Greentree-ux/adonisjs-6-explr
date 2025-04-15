import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('co_id').unsigned().references('cos.id').notNullable()
      table.string('business_name', 30).notNullable()
      table.string('businessname_full', 100).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
