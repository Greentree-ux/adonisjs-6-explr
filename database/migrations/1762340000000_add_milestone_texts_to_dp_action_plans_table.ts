import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dp_action_plans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('milestone_1_text').nullable().after('milestone_1_date')
      table.text('milestone_2_text').nullable().after('milestone_2_date')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('milestone_1_text')
      table.dropColumn('milestone_2_text')
    })
  }
}
