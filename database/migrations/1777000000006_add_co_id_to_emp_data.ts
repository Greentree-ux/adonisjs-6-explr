import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'emp_data'

  async up() {
    await this.db.rawQuery(`
      alter table ${this.tableName}
      add column if not exists co_id integer references cos(id)
    `)

    await this.db.rawQuery(`
      create index if not exists ${this.tableName}_co_id_index
      on ${this.tableName} (co_id)
    `)

    await this.db.rawQuery(`
      update emp_data as ed
      set co_id = u.co_id
      from users as u
      where lower(u.email) = lower(ed.email)
        and u.co_id is not null
        and ed.co_id is null
    `)

    await this.db.rawQuery(`
      update emp_data as ed
      set co_id = b.co_id
      from fn_roles as fr
      join fns as f on f.id = fr.fnid
      join locs as l on l.id = f.loc_id
      join businesses as b on b.id = l.business_id
      where ed.fnrole_id = fr.id
        and ed.co_id is null
    `)

    await this.db.rawQuery(`
      update emp_data
      set co_id = 1
      where co_id is null
    `)

    await this.db.rawQuery(`
      alter table ${this.tableName}
      alter column co_id set not null
    `)
  }

  async down() {
    await this.db.rawQuery(`drop index if exists ${this.tableName}_co_id_index`)
    await this.db.rawQuery(`
      alter table ${this.tableName}
      drop column if exists co_id
    `)
  }
}