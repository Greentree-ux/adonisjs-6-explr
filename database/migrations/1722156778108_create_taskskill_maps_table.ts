import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'taskskill_maps'
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('fnid').unsigned().notNullable()
      table.integer('taskid').unsigned().references('tasksets.id').notNullable()
      table.integer('roleno').unsigned().notNullable()
      table.integer('ksid01').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid02').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid03').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid04').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid05').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid06').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid07').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid08').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid09').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid10').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid11').unsigned().references('ks_definitions.id').nullable()
      table.integer('ksid12').unsigned().references('ks_definitions.id').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
