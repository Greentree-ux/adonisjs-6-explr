import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roletasksets'

  async up() {
    this.schema.raw(`DROP MATERIALIZED VIEW IF EXISTS roletasksets CASCADE;`)

    this.schema.raw(`CREATE MATERIALIZED VIEW roletasksets AS
      SELECT e.fnid, fn_name, c.subfnid, subfn_name, c.sub2fnord, sub_sub_fn_name, d.roleno, role_name, e.id, taskset, ei, lmh FROM tasksets e
JOIN fn_roles d ON e.fnid = d.fnid AND e.roleno = d.roleno
JOIN fn_caps c ON e.fnid = c.fnid AND e.subfnid = c.subfnid AND e.sub2fnord = c.sub2fnord
JOIN subfns b ON c.fnid = b.fnid AND c.subfnid = b.subfnid
JOIN fns a ON b.fnid = a.id
ORDER BY a.id, d.roleno;
    `)
  }

  async down() {
    this.schema.raw(`DROP MATERIALIZED VIEW IF EXISTS roletasksets CASCADE;`)
  }
}
