import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('approle_id').unsigned().references('app_roles.id').notNullable()
      table.integer('fnrole_id').unsigned().references('fn_roles.id').nullable()
      table.string('first_name').notNullable()
      table.string('last_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password', 255).notNullable()
      table.string('remember_me_token').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
