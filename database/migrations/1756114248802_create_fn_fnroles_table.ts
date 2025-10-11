import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fn_fnroles'

  async up() {
    this.schema.raw(`DROP MATERIALIZED VIEW IF EXISTS fn_fnroles CASCADE;`)

    this.schema.raw(`CREATE MATERIALIZED VIEW fn_fnroles AS
      SELECT fnid, fn_name, roleno, role_name FROM fn_roles b
JOIN fns a ON b.fnid = a.id ORDER BY a.id, b.roleno;
    `)
  }

  async down() {
    this.schema.raw(`DROP MATERIALIZED VIEW IF EXISTS fn_fnroles CASCADE;`)
  }
}
