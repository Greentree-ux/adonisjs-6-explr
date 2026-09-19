import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dp_reminders'

  async up() {
    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS repeat_every integer`
      )
      await db.rawQuery(
        `ALTER TABLE ${this.tableName} ADD COLUMN IF NOT EXISTS repeat_unit varchar(16)`
      )
      await db.rawQuery(
        `ALTER TABLE ${this.tableName}
         DROP CONSTRAINT IF EXISTS dp_reminders_repeat_period_check`
      )
      await db.rawQuery(
        `ALTER TABLE ${this.tableName}
         DROP CONSTRAINT IF EXISTS dp_reminders_repeat_unit_check`
      )
      await db.rawQuery(`ALTER TABLE ${this.tableName} ALTER COLUMN repeat_period TYPE text USING repeat_period::text`)
      await db.rawQuery(`ALTER TABLE ${this.tableName} ALTER COLUMN repeat_period SET DEFAULT 'once'`)
      await db.rawQuery(
        `UPDATE ${this.tableName}
         SET repeat_period = 'custom', repeat_every = 1, repeat_unit = 'weeks'
         WHERE repeat_period = 'weekly'`
      )
      await db.rawQuery(
        `UPDATE ${this.tableName}
         SET repeat_every = NULL, repeat_unit = NULL
        WHERE repeat_period = 'once'`
      )
      await db.rawQuery(
        `ALTER TABLE ${this.tableName}
         ADD CONSTRAINT dp_reminders_repeat_period_check
         CHECK (repeat_period IN ('once', 'custom'))`
      )
      await db.rawQuery(
        `ALTER TABLE ${this.tableName}
         ADD CONSTRAINT dp_reminders_repeat_unit_check
         CHECK (repeat_unit IS NULL OR repeat_unit IN ('days', 'weeks', 'months'))`
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE ${this.tableName}
         DROP CONSTRAINT IF EXISTS dp_reminders_repeat_period_check`
      )
      await db.rawQuery(
        `ALTER TABLE ${this.tableName}
         DROP CONSTRAINT IF EXISTS dp_reminders_repeat_unit_check`
      )
      await db.rawQuery(
        `UPDATE ${this.tableName}
         SET repeat_period = CASE
           WHEN repeat_period = 'custom' AND repeat_every = 1 AND repeat_unit = 'weeks' THEN 'weekly'
           ELSE 'once'
         END`
      )
      await db.rawQuery(
        `ALTER TABLE ${this.tableName}
         ALTER COLUMN repeat_period TYPE text USING repeat_period::text`
      )
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('repeat_unit')
      table.dropColumn('repeat_every')
    })
  }
}