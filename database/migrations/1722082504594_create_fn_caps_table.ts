import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fn_caps'

  async up() {
    // Drop existing constraint if exists
    await this.defer(async (db) => {
      await db.rawQuery(`
        DO $$ 
        BEGIN
          IF EXISTS (SELECT 1 
                    FROM information_schema.table_constraints 
                    WHERE constraint_name = 'subfnidfncapsfk') THEN
            ALTER TABLE fn_caps DROP CONSTRAINT subfnidfncapsfk;
          END IF;
        END $$;
      `)
    })
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable().defaultTo(1)
      table.integer('fnid').unsigned().notNullable()
      table.integer('subfnid').unsigned().notNullable()
      table.foreign(['fnid', 'subfnid'], 'subfnidfncapsfk')
        .references(['fnid', 'subfnid'])
        .inTable('subfns')
        .onDelete('CASCADE')
      table.integer('sub2fnord').unsigned().notNullable()
      table.string('sub_sub_fn_name', 50).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['fnid', 'subfnid', 'sub2fnord'], 'fncapssub2fnordidx')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
