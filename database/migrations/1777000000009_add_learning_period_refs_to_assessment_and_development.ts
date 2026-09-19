import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      insert into learning_periods (co_id, sequence, started_at, created_at, updated_at)
      select c.id, 1, now(), now(), now()
      from cos c
      where not exists (
        select 1 from learning_periods lp where lp.co_id = c.id
      )
    `)

    await this.db.rawQuery(`
      alter table assessment_submissions
      add column if not exists learning_period_id integer references learning_periods(id)
    `)

    await this.db.rawQuery(`
      alter table development_plans
      add column if not exists learning_period_id integer references learning_periods(id)
    `)

    await this.db.rawQuery(`
      update assessment_submissions as a
      set learning_period_id = lp.id
      from users as u
      join learning_periods as lp on lp.co_id = coalesce(u.co_id, 1) and lp.sequence = 1
      where a.subject_user_id = u.id
        and a.learning_period_id is null
    `)

    await this.db.rawQuery(`
      update development_plans as dp
      set learning_period_id = lp.id
      from users as u
      join learning_periods as lp on lp.co_id = coalesce(u.co_id, 1) and lp.sequence = 1
      where dp.user_id = u.id
        and dp.learning_period_id is null
    `)

    await this.db.rawQuery(`
      create index if not exists assessment_submissions_learning_period_id_index
      on assessment_submissions (learning_period_id)
    `)

    await this.db.rawQuery(`
      create index if not exists development_plans_learning_period_id_index
      on development_plans (learning_period_id)
    `)

    await this.db.rawQuery(`
      alter table assessment_submissions
      drop constraint if exists assessment_submissions_cycle_year_subject_user_id_unique
    `)

    await this.db.rawQuery(`
      alter table assessment_submissions
      add constraint assessment_submissions_subject_user_id_learning_period_id_unique
      unique (subject_user_id, learning_period_id)
    `)

    await this.db.rawQuery(`
      alter table development_plans
      drop constraint if exists development_plans_user_id_cycle_year_unique
    `)

    await this.db.rawQuery(`
      alter table development_plans
      add constraint development_plans_user_id_learning_period_id_unique
      unique (user_id, learning_period_id)
    `)

    await this.db.rawQuery(`
      alter table assessment_submissions
      alter column learning_period_id set not null
    `)

    await this.db.rawQuery(`
      alter table development_plans
      alter column learning_period_id set not null
    `)
  }

  async down() {
    await this.db.rawQuery(`
      alter table assessment_submissions
      drop constraint if exists assessment_submissions_subject_user_id_learning_period_id_unique
    `)

    await this.db.rawQuery(`
      alter table assessment_submissions
      add constraint assessment_submissions_cycle_year_subject_user_id_unique
      unique (cycle_year, subject_user_id)
    `)

    await this.db.rawQuery(`
      alter table development_plans
      drop constraint if exists development_plans_user_id_learning_period_id_unique
    `)

    await this.db.rawQuery(`
      alter table development_plans
      add constraint development_plans_user_id_cycle_year_unique
      unique (user_id, cycle_year)
    `)

    await this.db.rawQuery(`drop index if exists assessment_submissions_learning_period_id_index`)
    await this.db.rawQuery(`drop index if exists development_plans_learning_period_id_index`)

    await this.db.rawQuery(`
      alter table assessment_submissions
      drop column if exists learning_period_id
    `)

    await this.db.rawQuery(`
      alter table development_plans
      drop column if exists learning_period_id
    `)
  }
}