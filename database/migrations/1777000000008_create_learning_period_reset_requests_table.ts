import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'learning_period_reset_requests'

  async up() {
    await this.db.rawQuery(`
      create table if not exists ${this.tableName} (
        id serial primary key,
        co_id integer not null references cos(id) on delete cascade,
        first_approver_user_id integer not null references users(id) on delete cascade,
        second_approver_user_id integer null references users(id) on delete set null,
        status varchar(32) not null default 'pending' check (status in ('pending', 'completed')),
        requested_at timestamptz not null,
        completed_at timestamptz null,
        created_period_id integer null references learning_periods(id) on delete set null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      )
    `)

    await this.db.rawQuery(`
      create index if not exists ${this.tableName}_co_id_status_index
      on ${this.tableName} (co_id, status)
    `)

    await this.db.rawQuery(`
      create unique index if not exists learning_period_reset_requests_pending_unique
      on learning_period_reset_requests (co_id)
      where status = 'pending'
    `)
  }

  async down() {
    await this.db.rawQuery(`drop index if exists learning_period_reset_requests_pending_unique`)
    await this.db.rawQuery(`drop index if exists ${this.tableName}_co_id_status_index`)
    await this.db.rawQuery(`drop table if exists ${this.tableName}`)
  }
}