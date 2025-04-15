import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('ks_cats', (table) => {
      table.index('ks', 'kskscatsidx')
    })
  }

  async down() {
    this.schema.alterTable('ks_cats', (table) => {
      table.dropIndex('ks', 'kskscatsidx')
    })
  }
}
