import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roleskills'

  async up() {
    this.schema.raw(`DROP MATERIALIZED VIEW IF EXISTS roleskills CASCADE;`)

    this.schema.raw(`CREATE MATERIALIZED VIEW roleskills AS
      SELECT e.fnid, a.fn_name, c.catid, b.k_ss_gs, b.catseq, b.kscategory, c.catord, c.ksname, e.roleno, d.role_name, e.id AS ksid, e.ksdefinition FROM ks_definitions e
JOIN fn_roles d ON e.fnid = d.fnid AND e.roleno = d.roleno
JOIN ks_frameworks c ON e.fnid = c.fnid AND e.catid = c.catid AND e.catord = c.catord
JOIN ks_cats b ON c.catid = b.id
JOIN fns a ON c.fnid = a.id
ORDER BY fnid, roleno, b.id, b.catseq, c.catord;
    `)
  }

  async down() {
    this.schema.raw(`DROP MATERIALIZED VIEW IF EXISTS roleskills CASCADE;`)
  }
}
