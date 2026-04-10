/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

const AuthController = () => import('#controllers/auth_controller')
const FnFnrolesController = () => import('#controllers/fn_fnroles_controller')
const RoleskillsController = () => import('#controllers/roleskills_controller')
const SysAdminController = () => import('#controllers/sys_admin_controller')
const OrgAdminController = () => import('#controllers/org_admin_controller')

// Auth routes (public)
router
  .group(() => {
    router.post('/register', [AuthController, 'register']).as('api.auth.register')
    router.post('/login', [AuthController, 'login']).as('api.auth.login')
    router.post('/logout', [AuthController, 'logout']).as('api.auth.logout')
    router.get('/me', [AuthController, 'me']).as('api.auth.me')
    router.post('/forgot-password', [AuthController, 'forgotPassword']).as('api.auth.forgotPassword')
    router.post('/reset-password', [AuthController, 'resetPassword']).as('api.auth.resetPassword')
  })
  .prefix('/api/auth')

// Change password (requires auth, exempt from forceChangePassword)
router
  .post('/api/auth/change-password', [AuthController, 'changePassword'])
  .as('api.auth.changePassword')
  .use(middleware.auth())

// Sys Admin routes
router
  .group(() => {
    router.post('/org-admins', [SysAdminController, 'createOrgAdmin']).as('api.sysadmin.createOrgAdmin')
    router.get('/org-admins', [SysAdminController, 'listOrgAdmins']).as('api.sysadmin.listOrgAdmins')
  })
  .prefix('/api/sysadmin')
  .use([middleware.auth(), middleware.forceChangePassword(), middleware.role({ roles: ['sys_admin'] })])

// Org Admin routes
router
  .group(() => {
    router.get('/allowed-emails', [OrgAdminController, 'listAllowedEmails']).as('api.admin.listAllowedEmails')
    router.post('/allowed-emails', [OrgAdminController, 'addAllowedEmail']).as('api.admin.addAllowedEmail')
    router.delete('/allowed-emails/:id', [OrgAdminController, 'removeAllowedEmail']).as('api.admin.removeAllowedEmail')
    router.get('/users', [OrgAdminController, 'listUsers']).as('api.admin.listUsers')
    router.patch('/users/:id/manager', [OrgAdminController, 'updateUserManager']).as('api.admin.updateUserManager')
  })
  .prefix('/api/admin')
  .use([middleware.auth(), middleware.forceChangePassword(), middleware.role({ roles: ['org_admin'] })])

// Protected API routes
router
  .group(() => {
    router.get('/api/fnfnroles', [FnFnrolesController, 'index']).as('api.fnfnroles.index')
    // eslint-disable-next-line prettier/prettier
    router.get('/api/fnfnroles/:fnid/:roleno', [FnFnrolesController, 'show']).as('api.fnfnroles.show')
      .where('fnid', router.matchers.number())
      .where('roleno', router.matchers.number())

    router.get('/api/roleskills', [RoleskillsController, 'index']).as('api.roleskills.index')
    // eslint-disable-next-line prettier/prettier
    router.get('/api/roleskills/:fnid/:roleno', [RoleskillsController, 'show']).as('api.roleskills.show')
      .where('fnid', router.matchers.number())
      .where('roleno', router.matchers.number())
  })
  .use([middleware.auth(), middleware.forceChangePassword()])

// SPA catch-all route (public - Angular handles its own auth)
router.get('*', async ({ response }) => {
  const indexHtml = readFileSync(join(app.publicPath(), 'index.html'), 'utf-8')
  return response.type('html').send(indexHtml)
})
