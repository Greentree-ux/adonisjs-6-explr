import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    await this.db.rawQuery(`
      UPDATE users
      SET
        date_of_joining = COALESCE(users.date_of_joining, emp_data.date_of_joining),
        last_role_change = COALESCE(users.last_role_change, emp_data.last_role_change)
      FROM emp_data
      WHERE LOWER(users.email) = LOWER(emp_data.email)
    `)
  }

  async down() {
    await this.db.rawQuery(`
      UPDATE users
      SET
        date_of_joining = NULL,
        last_role_change = NULL
    `)
  }
}