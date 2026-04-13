import { BaseSeeder } from '@adonisjs/lucid/seeders'
import AppRole from '#models/app_role'
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

    // Seed the first Sys Admin account
    const sysAdminEmail = 'sysadmin@example.com'

    await EmpData.updateOrCreate(
      { email: sysAdminEmail },
      { email: sysAdminEmail, firstName: 'System', lastName: 'Admin' }
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

    console.log('✅ Seeded app_roles: sys_admin, org_admin, user')
    console.log('✅ Seeded Sys Admin: sysadmin@example.com / Change@Me123')
  }
}
