import { BaseSeeder } from '@adonisjs/lucid/seeders'
import AppRole from '#models/app_role'
import Co from '#models/co'
import User from '#models/user'
import EmpData from '#models/emp_data'

export default class extends BaseSeeder {
  async run() {
    // Seed the three application roles
    const roles = await AppRole.updateOrCreateMany('rName', [
      { rName: 'sys_admin' },
      { rName: 'org_admin' },
      { rName: 'user' },
    ])

    const sysAdminRole = roles.find((r) => r.rName === 'sys_admin')!

    /**
     * emp_data.co_id is NOT NULL with a foreign key to "cos", so the first
     * employee record cannot exist before an organisation does. A later
     * migration added that constraint without updating this seeder, which left
     * the documented bootstrap path failing on any fresh database with
     * `null value in column "co_id" of relation "emp_data"` — found while
     * bringing up the container stack for the first time (T5.1).
     *
     * The name is deliberately obvious placeholder text: real organisations are
     * created through the application and the competency imports, and nobody
     * should mistake this row for one of them.
     */
    const bootstrapCo = await Co.updateOrCreate(
      { coName: 'Bootstrap Organisation' },
      { coName: 'Bootstrap Organisation' }
    )

    // Seed the first Sys Admin account
    const sysAdminEmail = 'sysadmin@example.com'

    await EmpData.updateOrCreate(
      { email: sysAdminEmail },
      {
        email: sysAdminEmail,
        firstName: 'System',
        lastName: 'Admin',
        coId: bootstrapCo.id,
      }
    )

    await User.updateOrCreate(
      { email: sysAdminEmail },
      {
        email: sysAdminEmail,
        password: 'Change@Me123',
        firstName: 'System',
        lastName: 'Admin',
        approleId: sysAdminRole.id,
        mustChangePassword: true,
        empId: 0,
        mgrId: 0,
      }
    )

    console.log(`✅ Seeded bootstrap organisation: ${bootstrapCo.coName} (id ${bootstrapCo.id})`)
    console.log('✅ Seeded app_roles: sys_admin, org_admin, user')
    console.log('✅ Seeded Sys Admin: sysadmin@example.com / Change@Me123')
  }
}
