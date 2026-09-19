import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dp_focus_skills_target'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('source_fnid').unsigned().nullable().after('ks_id')
      table.integer('source_roleno').unsigned().nullable().after('source_fnid')
      table.foreign(['source_fnid', 'source_roleno']).references(['fnid', 'roleno']).inTable('fn_roles')
      table.dropUnique(['plan_id', 'ks_id'])
      table.unique(['plan_id', 'ks_id', 'source_fnid', 'source_roleno'], 'dp_focus_skills_target_unique')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['plan_id', 'ks_id', 'source_fnid', 'source_roleno'], 'dp_focus_skills_target_unique')
      table.unique(['plan_id', 'ks_id'])
      table.dropForeign(['source_fnid', 'source_roleno'])
      table.dropColumns('source_fnid', 'source_roleno')
    })
  }
}
