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

const FcmsController = () => import('#controllers/fcms_controller')
const FnFnrolesController = () => import('#controllers/fn_fnroles_controller')
const RoleskillsController = () => import('#controllers/roleskills_controller')

router.get('/api/home', [FcmsController, 'index']).as('api.home')

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

router.get('*', async ({ response }) => {
  const indexHtml = readFileSync(join(app.publicPath(), 'index.html'), 'utf-8')
  return response.type('html').send(indexHtml)
})
