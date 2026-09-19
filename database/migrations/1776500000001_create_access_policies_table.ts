import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'access_policies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('co_id').unsigned().references('cos.id').notNullable().unique()
      table
        .integer('level_restriction')
        .unsigned()
        .nullable()
        .comment('Max levels above user wlevel.ord; null = no restriction')
      table
        .enum('function_scope', ['same_function', 'same_location', 'same_business', 'same_company'])
        .notNullable()
        .defaultTo('same_company')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
