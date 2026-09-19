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
const AssessmentController = () => import('#controllers/assessment_controller')
const DevelopmentPlannerController = () => import('#controllers/development_planner_controller')

// Auth routes (public)
router
  .group(() => {
    router.post('/register', [AuthController, 'register']).as('api.auth.register')
    router
      .post('/register-invite', [AuthController, 'registerByInvite'])
      .as('api.auth.registerByInvite')
    router.get('/validate-invite', [AuthController, 'validateInvite']).as('api.auth.validateInvite')
    router.post('/login', [AuthController, 'login']).as('api.auth.login')
    router.post('/logout', [AuthController, 'logout']).as('api.auth.logout')
    router.get('/me', [AuthController, 'me']).as('api.auth.me')
    router
      .post('/forgot-password', [AuthController, 'forgotPassword'])
      .as('api.auth.forgotPassword')
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
    router
      .post('/org-admins', [SysAdminController, 'createOrgAdmin'])
      .as('api.sysadmin.createOrgAdmin')
    router
      .get('/org-admins', [SysAdminController, 'listOrgAdmins'])
      .as('api.sysadmin.listOrgAdmins')
    router
      .delete('/org-admins', [SysAdminController, 'deleteOrgAdmins'])
      .as('api.sysadmin.deleteOrgAdmins')
  })
  .prefix('/api/sysadmin')
  .use([
    middleware.auth(),
    middleware.forceChangePassword(),
    middleware.role({ roles: ['sys_admin'] }),
  ])

// Org Admin routes
router
  .group(() => {
    router.get('/emp-data', [OrgAdminController, 'listEmpData']).as('api.admin.listEmpData')
    router.post('/emp-data', [OrgAdminController, 'addEmpData']).as('api.admin.addEmpData')
    router.post('/emp-data/import', [OrgAdminController, 'importEmpData']).as('api.admin.importEmpData')
    router.put('/emp-data/:id', [OrgAdminController, 'updateEmpData']).as('api.admin.updateEmpData')
    router
      .delete('/emp-data/:id', [OrgAdminController, 'removeEmpData'])
      .as('api.admin.removeEmpData')
    router.get('/users', [OrgAdminController, 'listUsers']).as('api.admin.listUsers')
    router
      .patch('/users/:id/manager', [OrgAdminController, 'updateUserManager'])
      .as('api.admin.updateUserManager')
    router.get('/fn-roles', [OrgAdminController, 'listFnRoles']).as('api.admin.listFnRoles')
    router
      .get('/emp-data-invite', [OrgAdminController, 'listEmpDataForInvite'])
      .as('api.admin.listEmpDataForInvite')
    router
      .get('/registered-employees', [OrgAdminController, 'listRegisteredEmployees'])
      .as('api.admin.listRegisteredEmployees')
    router
      .patch('/users/:id/role-manager', [OrgAdminController, 'updateUserRoleManager'])
      .as('api.admin.updateUserRoleManager')
    router
      .post('/send-invitations', [OrgAdminController, 'sendInvitations'])
      .as('api.admin.sendInvitations')
    router
      .get('/access-policy', [OrgAdminController, 'getAccessPolicy'])
      .as('api.admin.getAccessPolicy')
    router
      .post('/performance-period-reset', [OrgAdminController, 'startFreshAssessmentDevelopment'])
      .as('api.admin.startFreshAssessmentDevelopment')
    router
      .put('/access-policy', [OrgAdminController, 'updateAccessPolicy'])
      .as('api.admin.updateAccessPolicy')
  })
  .prefix('/api/admin')
  .use([
    middleware.auth(),
    middleware.forceChangePassword(),
    middleware.role({ roles: ['org_admin'] }),
  ])

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

    router
      .get('/api/assessment', [AssessmentController, 'getFormData'])
      .as('api.assessment.getFormData')
    router
      .get('/api/assessment/team', [AssessmentController, 'getTeamMembers'])
      .as('api.assessment.getTeamMembers')
    router.post('/api/assessment/submit', [AssessmentController, 'submit']).as('api.assessment.submit')

      router
        .get('/api/development-plan/team-members', [DevelopmentPlannerController, 'getTeamMembers'])
        .as('api.devplan.getTeamMembers')
      router
        .get('/api/development-plan/stage/:stage', [DevelopmentPlannerController, 'getStage'])
        .as('api.devplan.getStage')
        .where('stage', router.matchers.number())
      router
        .post('/api/development-plan/stage/:stage', [DevelopmentPlannerController, 'saveStage'])
        .as('api.devplan.saveStage')
        .where('stage', router.matchers.number())
      router
        .post('/api/development-plan/finalize', [DevelopmentPlannerController, 'finalize'])
        .as('api.devplan.finalize')
      router
        .get('/api/development-plan/export', [DevelopmentPlannerController, 'exportCsv'])
        .as('api.devplan.exportCsv')
  })
  .use([middleware.auth(), middleware.forceChangePassword()])

// SPA catch-all route (public - Angular handles its own auth)
router.get('*', async ({ response }) => {
  const indexHtml = readFileSync(join(app.publicPath(), 'index.html'), 'utf-8')
  return response.type('html').send(indexHtml)
})
